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

  return {
    ...autoAdditionalData,
    ...resolvedDefaultAdditionalData,
    ...fileSpecificData,
  };
}
