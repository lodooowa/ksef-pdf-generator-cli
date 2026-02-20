import { describe, expect, it } from 'vitest';
import { isXmlFile, parseCliArgs, toPdfOutputPath } from './cli-utils';

describe('parseCliArgs', () => {
  it('parses input dir and watch flag', () => {
    const result = parseCliArgs(['--input-dir', './input', '--output-dir', './out', '--watch']);

    expect(result).toEqual({
      inputDir: './input',
      outputDir: './out',
      watch: true,
    });
  });

  it('throws when output dir is missing', () => {
    expect(() => parseCliArgs(['--input', './invoice.xml'])).toThrow('Brak --output-dir');
  });

  it('throws when no input source is provided', () => {
    expect(() => parseCliArgs(['--output-dir', './out'])).toThrow('Podaj --input albo --input-dir');
  });
});

describe('paths and XML detection', () => {
  it('builds pdf output path', () => {
    expect(toPdfOutputPath('/tmp/a/invoice.xml', '/tmp/out')).toBe('/tmp/out/invoice.pdf');
  });

  it('detects xml extension case-insensitively', () => {
    expect(isXmlFile('a.xml')).toBe(true);
    expect(isXmlFile('a.XML')).toBe(true);
    expect(isXmlFile('a.txt')).toBe(false);
  });
});
