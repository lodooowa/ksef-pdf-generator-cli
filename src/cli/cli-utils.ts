import path from 'path';

export type CliOptions = {
  input?: string;
  inputDir?: string;
  outputDir: string;
  watch: boolean;
  nrKSeF?: string;
  qrCode?: string;
};

export function parseCliArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    watch: false,
  };

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

  return options as CliOptions;
}

export function toPdfOutputPath(xmlPath: string, outputDir: string): string {
  return path.join(outputDir, `${path.basename(xmlPath, path.extname(xmlPath))}.pdf`);
}

export function isXmlFile(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === '.xml';
}
