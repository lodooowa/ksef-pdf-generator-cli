import { generateInvoice, generatePDFUPO } from '../lib-public';

import { AdditionalDataTypes } from '../lib-public/types/common.types';

const inputInvoice: HTMLInputElement = document.getElementById('xmlInput') as HTMLInputElement;
const inputUPO: HTMLInputElement = document.getElementById('xmlInputUPO') as HTMLInputElement;

inputInvoice.addEventListener('change', async (): Promise<void> => {
  const file: File | undefined = inputInvoice.files?.[0];

  if (!file) {
    return;
  }

  const additionalData: AdditionalDataTypes = {
    nrKSeF: '',
    qrCode: '',
  };

  generateInvoice(file, additionalData, 'blob').then((data: Blob): void => {
    const url: string = URL.createObjectURL(data);

    const a: HTMLAnchorElement = document.createElement('a');

    a.href = url;
    a.download = 'test.pdf';
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
});

inputUPO.addEventListener('change', async (): Promise<void> => {
  const file: File | undefined = inputUPO.files?.[0];

  if (!file) {
    return;
  }
  generatePDFUPO(file).then((blob) => {
    const url: string = URL.createObjectURL(blob);

    const a: HTMLAnchorElement = document.createElement('a');

    a.href = url;
    a.download = 'test.pdf';
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
});
