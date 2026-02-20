#!/usr/bin/env node
import fs from 'node:fs/promises';
import { watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { generateInvoice } from '../dist/ksef-fe-invoice-converter.js';

function parseCliArgs(argv) {
  const options = { watch: false };

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

function toBase64Url(base64Text) {
  return base64Text.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function parseKsefFileName(xmlPath) {
  const fileName = path.basename(xmlPath);
  const match = fileName.match(/^KSEF_(\d{10})-(\d{8})-(.+)\.xml$/i);

  if (!match) {
    return undefined;
  }

  const nip = match[1];
  const rawDate = match[2];
  const nrKSeF = `${nip}-${rawDate}-${match[3]}`;
  const issueDate = `${rawDate.slice(6, 8)}-${rawDate.slice(4, 6)}-${rawDate.slice(0, 4)}`;

  return {
    nip,
    issueDate,
    nrKSeF,
  };
}

function buildAutoAdditionalData(xmlPath, xmlText) {
  const nameData = parseKsefFileName(xmlPath);
  const hash = toBase64Url(createHash('sha256').update(xmlText, 'utf8').digest('base64'));

  return {
    nrKSeF: nameData?.nrKSeF ?? '',
    qrCode: nameData ? `https://qr.ksef.mf.gov.pl/invoice/${nameData.nip}/${nameData.issueDate}/${hash}` : undefined,
  };
}

function resolveAdditionalDataForFile(xmlPath, xmlText, defaultAdditionalData, additionalDataMap) {
  const fileName = path.basename(xmlPath);
  const fileSpecificData = additionalDataMap[xmlPath] ?? additionalDataMap[fileName] ?? {};
  const autoAdditionalData = buildAutoAdditionalData(xmlPath, xmlText);

  return {
    ...autoAdditionalData,
    ...defaultAdditionalData,
    ...fileSpecificData,
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

async function convertXmlToPdf(xmlPath, xmlText, outputDir, additionalData) {
  const file = new File([xmlText], path.basename(xmlPath), { type: 'text/xml' });
  const blob = await generateInvoice(file, additionalData, 'blob');
  const outputPath = toPdfOutputPath(xmlPath, outputDir);
  const buffer = Buffer.from(await blob.arrayBuffer());

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, buffer);
  console.log(`Wygenerowano: ${outputPath}`);
}

async function convertSingleFile(xmlPath, outputDir, defaultAdditionalData, additionalDataMap) {
  const xmlText = await fs.readFile(xmlPath, 'utf-8');
  const additionalData = resolveAdditionalDataForFile(xmlPath, xmlText, defaultAdditionalData, additionalDataMap);

  await convertXmlToPdf(xmlPath, xmlText, outputDir, additionalData);
}

async function convertFromInputList(input, outputDir, additionalData, additionalDataMap) {
  const files = input
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((file) => path.resolve(repoRoot, file))
    .filter(isXmlFile);

  for (const file of files) {
    await convertSingleFile(file, outputDir, additionalData, additionalDataMap);
  }
}

async function convertFromDirectory(inputDir, outputDir, additionalData, additionalDataMap) {
  const absoluteInputDir = path.resolve(repoRoot, inputDir);
  const entries = await fs.readdir(absoluteInputDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile() && isXmlFile(entry.name)) {
      const xmlPath = path.join(absoluteInputDir, entry.name);
      await convertSingleFile(xmlPath, outputDir, additionalData, additionalDataMap);
    }
  }
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
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
  const additionalData = {
    nrKSeF: options.nrKSeF,
    qrCode: options.qrCode,
    ...jsonAdditionalData,
  };

  if (options.input) {
    await convertFromInputList(options.input, outputDir, additionalData, additionalDataMap);
  }

  if (!options.inputDir) {
    return;
  }

  const absoluteInputDir = path.resolve(repoRoot, options.inputDir);
  await convertFromDirectory(absoluteInputDir, outputDir, additionalData, additionalDataMap);

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
        await convertSingleFile(absoluteFile, outputDir, additionalData, additionalDataMap);
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

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
