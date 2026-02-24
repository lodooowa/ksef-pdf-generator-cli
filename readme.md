# Biblioteka do generowania wizualizacji PDF faktur i UPO

Biblioteka generuje wizualizacje PDF faktur oraz UPO na podstawie plików XML. Repozytorium zawiera:
- bibliotekę TypeScript (API eksportowane z `src/lib-public`),
- prostą aplikację pokazową uruchamianą przez Vite,
- tryb CLI do wsadowej konwersji XML -> PDF.

---

## 1. Zakres funkcjonalny

Aplikacja/biblioteka obsługuje:
- generowanie PDF faktur dla schematów **FA (1), FA (2), FA (3)**,
- generowanie PDF UPO,
- uruchamianie konwersji z CLI dla pojedynczych plików, listy plików oraz katalogu,
- opcjonalny tryb nasłuchiwania katalogu wejściowego (`--watch`).

---

## 2. Uruchomienie aplikacji pokazowej

1. Zainstaluj Node.js 22.x (zgodnie z obrazem Docker opartym o Node 22).
2. Sklonuj repozytorium i przejdź do folderu projektu:
   ```bash
   git clone https://github.com/CIRFMF/ksef-pdf-generator-cli.git
   cd ksef-pdf-generator-cli
   ```
3. Zainstaluj zależności:
   ```bash
   npm install
   ```
4. Uruchom aplikację pokazową:
   ```bash
   npm run dev
   ```

Aplikacja uruchamia się domyślnie pod adresem: [http://localhost:5173/](http://localhost:5173/).

### Interfejs demo

Demo zawiera dwa pola wyboru plików:
- **Wygeneruj fakturę**,
- **Wygeneruj UPO**.

Po wskazaniu pliku XML generowany PDF zostaje pobrany jako `test.pdf`.

---

## 3. Budowanie biblioteki

```bash
npm run build
```

Build tworzy artefakty biblioteki w katalogu `dist/`.

---

## 4. Generowanie faktury (demo)

1. Uruchom `npm run dev`.
2. W sekcji **Wygeneruj fakturę** wybierz plik XML zgodny z FA(1)/FA(2)/FA(3).
3. Przykładowy plik testowy znajduje się w repozytorium:
   ```
   assets/invoice.xml
   ```
4. PDF zostanie wygenerowany i pobrany.

---

## 5. Generowanie UPO (demo)

1. Uruchom `npm run dev`.
2. W sekcji **Wygeneruj UPO** wybierz plik XML UPO.
3. Przykładowy plik testowy znajduje się w repozytorium:
   ```
   assets/upo.xml
   ```
4. PDF zostanie wygenerowany i pobrany.

---

## 6. Testy

Projekt wykorzystuje **Vitest**.

- Wszystkie testy:
  ```bash
  npm run test
  ```
- Testy z UI:
  ```bash
  npm run test:ui
  ```
- Tryb CI + coverage:
  ```bash
  npm run test:ci
  ```

Raport pokrycia: `coverage/index.html`.

---

## 7. Tryb CLI (Node.js)

Polecenie CLI jest dostępne jako:
- skrypt projektu: `npm run cli -- ...` (skrypt najpierw wykonuje build),
- binarka pakietu: `ksef-pdf-cli`.

### Podstawowe użycie

```bash
npm run cli -- --input assets/invoice.xml --output-dir ./out --nr-ksef "KSEF-123" --qr-code "https://example.local/qr"
```

### Konwersja wielu plików

```bash
npm run cli -- --input assets/invoice-a.xml,assets/invoice-b.xml --output-dir ./out
```

### Konwersja katalogu

```bash
npm run cli -- --input-dir ./input --output-dir ./out
```

### `additionalData`

Dane można przekazać przez dedykowane flagi:

```bash
npm run cli -- --input assets/invoice.xml --output-dir ./out --nr-ksef "KSEF-123" --qr-code "https://twoj-link-qr"
```

Dodatkowe pola JSON:

```bash
npm run cli -- --input assets/invoice.xml --output-dir ./out --additional-data-json '{"isMobile":true}'
```

Mapa `additionalData` per plik:

```bash
npm run cli -- --input assets/invoice-a.xml,assets/invoice-b.xml --output-dir ./out \
  --additional-data-map-json '{"invoice-a.xml":{"nrKSeF":"KSEF-A","qrCode":"https://qr/a"},"invoice-b.xml":{"nrKSeF":"KSEF-B","qrCode":"https://qr/b"}}'
```

Mapowanie działa po **nazwie pliku** (`invoice-a.xml`) albo **pełnej ścieżce**.

### Auto-wyciąganie danych QR (KOD I)

CLI automatycznie wylicza link QR KOD I:
- `https://qr.ksef.mf.gov.pl/invoice/{NIP}/{DD-MM-RRRR}/{SHA256_Base64URL}`,
- hash SHA-256 liczony jest z pełnej zawartości XML,
- dane `NIP` i data są wyciągane z nazwy pliku.

Wymagany format nazwy pliku:
- `KSEF_NIP_DATA_ID.xml`, np. `KSEF_5555555555-20250808-9231003CA67B-BE.xml`.

Znaczenie segmentów:
- `NIP` -> 10 cyfr,
- `DATA` -> `RRRRMMDD` (konwertowane do `DD-MM-RRRR`),
- `ID` -> dowolny identyfikator.

`nrKSeF` jest automatycznie ustawiane na `NIP-DATA-ID`.

Priorytet danych (od najniższego):
1. auto-wyliczenie z nazwy pliku,
2. dane domyślne (`--nr-ksef`, `--qr-code`, `--additional-data-json`),
3. dane per plik (`--additional-data-map-json`).

### Tryb nasłuchiwania katalogu

```bash
npm run cli -- --input-dir ./input --output-dir ./out --watch
```

W trybie `--watch` każde nowe XML dodane do katalogu wejściowego jest automatycznie przetwarzane.

### Pomoc CLI

```bash
npm run cli -- --help
```

---

## 8. Docker

### Budowanie obrazu

```bash
docker build -t ksef-pdf-cli .
```

### Uruchomienie jednorazowe

```bash
docker run --rm \
  -v /volume1/docker/ksef/input:/app/input \
  -v /volume1/docker/ksef/output:/app/output \
  ksef-pdf-cli \
  --input-dir /app/input --output-dir /app/output
```

### Uruchomienie w trybie nasłuchiwania

```bash
docker run --rm \
  -v /volume1/docker/ksef/input:/app/input \
  -v /volume1/docker/ksef/output:/app/output \
  ksef-pdf-cli \
  --input-dir /app/input --output-dir /app/output --watch
```

---

## 9. Uwagi

- Pliki XML powinny być poprawne i zgodne z odpowiednią strukturą.
- Przy problemach z wersją Node.js warto użyć `nvm`.

## Dokumentacja narzędzi

- Vitest Docs — https://vitest.dev/guide/
- Vite Docs — https://vitejs.dev/guide/
- TypeScript Handbook — https://www.typescriptlang.org/docs/
