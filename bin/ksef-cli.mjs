#!/usr/bin/env node
import fs from 'node:fs/promises';
import { watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
    }
  }

  if (!options.outputDir) {
    throw new Error('Brak --output-dir');
  }
  if (!options.input && !options.inputDir) {
    throw new Error('Podaj --input albo --input-dir');
  }

  return options;
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

async function convertXmlToPdf(xmlPath, outputDir, additionalData) {
  const xmlText = await fs.readFile(xmlPath, 'utf-8');
  const file = new File([xmlText], path.basename(xmlPath), { type: 'text/xml' });
  const blob = await generateInvoice(file, additionalData, 'blob');
  const outputPath = toPdfOutputPath(xmlPath, outputDir);
  const buffer = Buffer.from(await blob.arrayBuffer());

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, buffer);
  console.log(`Wygenerowano: ${outputPath}`);
}

async function convertFromInputList(input, outputDir, additionalData) {
  const files = input
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((file) => path.resolve(repoRoot, file))
    .filter(isXmlFile);

  for (const file of files) {
    await convertXmlToPdf(file, outputDir, additionalData);
  }
}

async function convertFromDirectory(inputDir, outputDir, additionalData) {
  const absoluteInputDir = path.resolve(repoRoot, inputDir);
  const entries = await fs.readdir(absoluteInputDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile() && isXmlFile(entry.name)) {
      await convertXmlToPdf(path.join(absoluteInputDir, entry.name), outputDir, additionalData);
    }
  }
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  const outputDir = path.resolve(repoRoot, options.outputDir);
  const additionalData = {
    nrKSeF: options.nrKSeF,
    qrCode: options.qrCode,
  };

  if (options.input) {
    await convertFromInputList(options.input, outputDir, additionalData);
  }

  if (!options.inputDir) {
    return;
  }

  const absoluteInputDir = path.resolve(repoRoot, options.inputDir);
  await convertFromDirectory(absoluteInputDir, outputDir, additionalData);

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
        await convertXmlToPdf(absoluteFile, outputDir, additionalData);
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
