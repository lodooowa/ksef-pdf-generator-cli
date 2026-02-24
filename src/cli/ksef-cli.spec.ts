import { describe, expect, it } from 'vitest';

import { resolveAdditionalDataForFile } from '../../bin/additional-data.mjs';

describe('resolveAdditionalDataForFile', () => {
  it('keeps auto nrKSeF and qrCode when CLI options are undefined', () => {
    const xmlPath = '/tmp/KSEF_5260250995-20260202-ABC.xml';
    const xmlBuffer = Buffer.from('<Invoice><Id>1</Id></Invoice>', 'utf-8');
    const defaultAdditionalData = { nrKSeF: undefined, qrCode: undefined };

    const result = resolveAdditionalDataForFile(xmlPath, xmlBuffer, defaultAdditionalData, {});

    expect(result.nrKSeF).toBe('5260250995-20260202-ABC');
    expect(result.qrCode).toBeDefined();
    expect(result.qrCode).toMatch(/^https:\/\/qr\.ksef\.mf\.gov\.pl\/invoice\/5260250995\/02-02-2026\/[A-Za-z0-9_-]+$/);
  });

  it('uses manual CLI qrCode override when provided', () => {
    const xmlPath = '/tmp/KSEF_5260250995-20260202-ABC.xml';
    const xmlBuffer = Buffer.from('<Invoice><Id>1</Id></Invoice>', 'utf-8');
    const defaultAdditionalData = { qrCode: 'https://manual.example/qr' };

    const result = resolveAdditionalDataForFile(xmlPath, xmlBuffer, defaultAdditionalData, {});

    expect(result.nrKSeF).toBe('5260250995-20260202-ABC');
    expect(result.qrCode).toBe('https://manual.example/qr');
  });
});
