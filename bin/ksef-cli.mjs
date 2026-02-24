#!/usr/bin/env node
import fs from 'node:fs/promises';
import { watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateInvoice } from '../dist/ksef-fe-invoice-converter.js';
import { pruneUndefined, resolveAdditionalDataForFile } from './additional-data.mjs';

function parseCliArgs(argv) {
  const options = { watch: false, debug: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    switch (arg) {
      case '--input':
        options.input = next;
        i += 1;
        break;
      case '--input-dir':
        options.inputDir = next;
        i += 1;
        break;
      case '--output-dir':
        options.outputDir = next;
        i += 1;
        break;
      case '--nr-ksef':
        options.nrKSeF = next;
        i += 1;
        break;
      case '--qr-code':
        options.qrCode = next;
        i += 1;
        break;
      case '--watch':
        options.watch = true;
        break;
      case '--debug':
        options.debug = true;
        break;
      case '--additional-data-json':
        options.additionalDataJson = next;
        i += 1;
        break;
      case '--additional-data-map-json':
        options.additionalDataMapJson = next;
        i += 1;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  if (options.help) {
    return options;
  }

  if (!options.outputDir) {
    throw new Error('Brak --output-dir');
  }
  if (!options.input && !options.inputDir) {
    throw new Error('Podaj --input albo --input-dir');
  }

  return options;
}

function printHelp() {
  console.log(`Użycie:
  node ./bin/ksef-cli.mjs --input <a.xml,b.xml> --output-dir <dir> [--nr-ksef <value>] [--qr-code <value>]
  node ./bin/ksef-cli.mjs --input-dir <dir> --output-dir <dir> [--watch]

Opcje:
  --input                 Lista plików XML rozdzielona przecinkami.
  --input-dir             Katalog wejściowy z plikami XML.
  --output-dir            Katalog wyjściowy na PDF (wymagany).
  --nr-ksef               AdditionalDataTypes.nrKSeF (nadpisuje auto-wyciąganie z nazwy KSEF_NIP_DATA_ID.xml).
  --qr-code               AdditionalDataTypes.qrCode (nadpisuje auto-generowanie KOD I).
  --additional-data-json  JSON do scalenia z additionalData, np. '{"isMobile":true}'.
  --additional-data-map-json
                          JSON mapujący additionalData per plik, np.
                          '{"KSEF_5555555555-20250808-ABC.xml":{"nrKSeF":"5555555555-20250808-ABC"}}'.
                          Klucz = nazwa pliku XML (basename) albo pełna ścieżka.
  --debug                 Loguje final additionalData dla każdego pliku.
  KSEF_CLI_DEBUG=1        Rozszerzone logi diagnostyczne (w tym analiza danych QR/nrKSeF).
  --watch                 Nasłuchuje nowe pliki XML w --input-dir.
  --help, -h              Wyświetla pomoc.
`);
}

function isXmlFile(filePath) {
  return path.extname(filePath).toLowerCase() === '.xml';
}

function toPdfOutputPath(xmlPath, outputDir) {
  return path.join(outputDir, `${path.basename(xmlPath, path.extname(xmlPath))}.pdf`);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

async function convertXmlToPdf(xmlPath, xmlText, outputDir, additionalData) {
  const start = Date.now();
  console.info(`[ksef-cli] Start generowania PDF dla: ${xmlPath}`);
  const file = new File([xmlText], path.basename(xmlPath), { type: 'text/xml' });
  const blob = await generateInvoice(file, additionalData, 'blob');
  const outputPath = toPdfOutputPath(xmlPath, outputDir);
  const tempOutputPath = `${outputPath}.${process.pid}.${Date.now()}.tmp`;
  const syncOutputPath = `${outputPath}.sync`;
  const buffer = Buffer.from(await blob.arrayBuffer());

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const fileHandle = await fs.open(tempOutputPath, 'w');

  try {
    await fileHandle.writeFile(buffer);
    await fileHandle.sync();
  } finally {
    await fileHandle.close();
  }

  await fs.rename(tempOutputPath, outputPath);
  await fs.rename(outputPath, syncOutputPath);
  await fs.rename(syncOutputPath, outputPath);
  await fs.utimes(outputPath, new Date(), new Date());
  console.log(`[ksef-cli] Wygenerowano: ${outputPath} (${Date.now() - start} ms)`);
}

async function convertSingleFile(xmlPath, outputDir, defaultAdditionalData, additionalDataMap, debug = false) {
  console.info(`[ksef-cli] Odczyt XML: ${xmlPath}`);
  const xmlText = await fs.readFile(xmlPath, 'utf-8');
  const additionalData = resolveAdditionalDataForFile(xmlPath, xmlText, defaultAdditionalData, additionalDataMap);
  if (debug) {
    console.debug(`[debug] additionalData (${path.basename(xmlPath)}):`, additionalData);
  }

  await convertXmlToPdf(xmlPath, xmlText, outputDir, additionalData);
}

async function convertFromInputList(input, outputDir, additionalData, additionalDataMap, debug = false) {
  const files = input
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((file) => path.resolve(repoRoot, file))
    .filter(isXmlFile);

  console.info(`[ksef-cli] Do przetworzenia (${files.length}) plików z --input.`);

  for (const file of files) {
    await convertSingleFile(file, outputDir, additionalData, additionalDataMap, debug);
  }
}

async function convertFromDirectory(inputDir, outputDir, additionalData, additionalDataMap, debug = false) {
  const absoluteInputDir = path.resolve(repoRoot, inputDir);
  const entries = await fs.readdir(absoluteInputDir, { withFileTypes: true });
  const xmlEntries = entries.filter((entry) => entry.isFile() && isXmlFile(entry.name));

  console.info(`[ksef-cli] Do przetworzenia (${xmlEntries.length}) plików z katalogu: ${absoluteInputDir}`);

  for (const entry of xmlEntries) {
    const xmlPath = path.join(absoluteInputDir, entry.name);
    await convertSingleFile(xmlPath, outputDir, additionalData, additionalDataMap, debug);
  }
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  if (options.debug && !process.env.KSEF_CLI_DEBUG) {
    process.env.KSEF_CLI_DEBUG = '1';
  }

  let jsonAdditionalData = {};
  if (options.additionalDataJson) {
    jsonAdditionalData = JSON.parse(options.additionalDataJson);
  }

  let additionalDataMap = {};
  if (options.additionalDataMapJson) {
    additionalDataMap = JSON.parse(options.additionalDataMapJson);
  }

  const outputDir = path.resolve(repoRoot, options.outputDir);
  const additionalData = pruneUndefined({ ...jsonAdditionalData });

  console.info('[ksef-cli] Start pracy CLI', {
    input: options.input,
    inputDir: options.inputDir,
    outputDir,
    watch: options.watch,
    debug: options.debug || process.env.KSEF_CLI_DEBUG === '1',
  });

  if (options.nrKSeF) {
    additionalData.nrKSeF = options.nrKSeF;
  }

  if (options.qrCode) {
    additionalData.qrCode = options.qrCode;
  }

  if (options.input) {
    await convertFromInputList(options.input, outputDir, additionalData, additionalDataMap, options.debug);
  }

  if (!options.inputDir) {
    return;
  }

  const absoluteInputDir = path.resolve(repoRoot, options.inputDir);
  await convertFromDirectory(absoluteInputDir, outputDir, additionalData, additionalDataMap, options.debug);

  if (!options.watch) {
    return;
  }

  console.log(`Nasłuchiwanie katalogu: ${absoluteInputDir}`);
  const watched = new Set();
  const watcher = watch(absoluteInputDir, async (eventType, filename) => {
    if (!filename || eventType !== 'rename' || !isXmlFile(filename)) {
      return;
    }

    const absoluteFile = path.join(absoluteInputDir, filename);
    if (watched.has(absoluteFile)) {
      return;
    }

    watched.add(absoluteFile);
    setTimeout(() => watched.delete(absoluteFile), 1000);

    try {
      const stat = await fs.stat(absoluteFile);
      if (stat.isFile()) {
        await convertSingleFile(absoluteFile, outputDir, additionalData, additionalDataMap, options.debug);
      }
    } catch {
      // plik mógł zostać usunięty zanim zdążyliśmy go przetworzyć
    }
  });

  process.on('SIGINT', () => {
    watcher.close();
    process.exit(0);
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error?.message ?? error);
    process.exit(1);
  });
}
