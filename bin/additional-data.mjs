import path from 'node:path';
import { createHash } from 'node:crypto';

export function pruneUndefined(data) {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
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

export function resolveAdditionalDataForFile(xmlPath, xmlText, defaultAdditionalData, additionalDataMap) {
  const fileName = path.basename(xmlPath);
  const fileSpecificData = pruneUndefined(additionalDataMap[xmlPath] ?? additionalDataMap[fileName] ?? {});
  const resolvedDefaultAdditionalData = pruneUndefined(defaultAdditionalData ?? {});
  const autoAdditionalData = buildAutoAdditionalData(xmlPath, xmlText);
  const fileNameData = parseKsefFileName(xmlPath);

  const diagnostics = {
    fileName,
    fileNameMatchedPattern: Boolean(fileNameData),
    hasAutoNrKSeF: Boolean(autoAdditionalData.nrKSeF),
    hasAutoQrCode: Boolean(autoAdditionalData.qrCode),
    defaultDataKeys: Object.keys(resolvedDefaultAdditionalData),
    fileSpecificDataKeys: Object.keys(fileSpecificData),
  };

  if (!diagnostics.fileNameMatchedPattern) {
    console.warn(
      `[ksef-cli] [${fileName}] Nazwa pliku nie pasuje do wzorca KSEF_NIP_DATA_ID.xml. ` +
        'Auto-uzupełnianie nrKSeF/QR jest wyłączone dla tego pliku.'
    );
  }

  const resolvedAdditionalData = {
    ...autoAdditionalData,
    ...resolvedDefaultAdditionalData,
    ...fileSpecificData,
  };

  if (!resolvedAdditionalData.nrKSeF || !resolvedAdditionalData.qrCode) {
    console.warn(
      `[ksef-cli] [${fileName}] Brak pełnych danych do sekcji QR ` +
        `(nrKSeF=${Boolean(resolvedAdditionalData.nrKSeF)}, qrCode=${Boolean(resolvedAdditionalData.qrCode)}).`
    );
  }

  if (process.env.KSEF_CLI_DEBUG === '1') {
    console.debug(`[ksef-cli] [${fileName}] Diagnostyka additionalData:`, {
      ...diagnostics,
      resolvedAdditionalData,
    });
  }

  return resolvedAdditionalData;
}
