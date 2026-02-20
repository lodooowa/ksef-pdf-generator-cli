# Biblioteka do generowania wizualizacji PDF faktur i UPO

Biblioteka do generowania wizualizacji PDF faktur oraz UPO na podstawie plików XML po stronie klienta.

---

## 1. Główne ustalenia

    Biblioteka zawiera następujące funkcjonalności:
    - Generowanie wizualizacji PDF faktur
    - Generowanie wizualizacji PDF UPO

---

## 2. Jak uruchomić aplikację pokazową

1. Zainstaluj Node.js w wersji **22.14.0**  
   Możesz pobrać Node.js z oficjalnej strony: [https://nodejs.org](https://nodejs.org)

2. Sklonuj repozytorium i przejdź do folderu projektu:
   ```bash
   git clone https://github.com/CIRFMF/ksef-pdf-generator#
   cd ksef-pdf-generator
   ```

3. Zainstaluj zależności:
   ```bash
   npm install
   ```

4. Uruchom aplikację:
   ```bash
   npm run dev
   ```

Aplikacja uruchomi się domyślnie pod adresem: [http://localhost:5173/](http://localhost:5173/)

## 2.1 Budowanie bibliotki

1. Jak zbudować bibliotekę produkcyjnie:
   ```bash
   npm run build
   ```

## 3. Jak wygenerować fakturę

1. Po uruchomieniu aplikacji przejdź do **Wygeneruj wizualizacje faktury PDF**.
2. Wybierz plik XML zgodny ze schemą **FA(1), FA(2) lub FA(3)**.
3. Przykładowy plik znajduje się w folderze:
   ```
   examples/invoice.xml
   ```  
4. Po wybraniu pliku, PDF zostanie wygenerowany.

---

## 4. Jak wygenerować UPO

1. Po uruchomieniu aplikacji przejdź do **Wygeneruj wizualizacje UPO PDF**.
2. Wybierz plik XML zgodny ze schemą **UPO v4_2**.
3. Przykładowy plik znajduje się w folderze:
   ```
   examples/upo.xml
   ```  
4. Po wybraniu pliku, PDF zostanie wygenerowany.

---

## 5. Testy jednostkowe

Aplikacja zawiera zestaw testów napisanych w **TypeScript**, które weryfikują poprawność działania aplikacji.  
Projekt wykorzystuje **Vite** do bundlowania i **Vitest** jako framework testowy.

### Uruchamianie testów

1. Uruchom wszystkie testy:
   ```bash
   npm run test
   ```

2. Uruchom testy z interfejsem graficznym:
   ```bash
   npm run test:ui
   ```

3. Uruchom testy w trybie CI z raportem pokrycia:
   ```bash
   npm run test:ci
   ```

---

Raport: /coverage/index.html

---

### 1. Nazewnictwo zmiennych i metod

- **Polsko-angielskie nazwy** stosowane w zmiennych, typach i metodach wynikają bezpośrednio ze struktury pliku schemy
  faktury.  
  Takie podejście zapewnia spójność i ujednolicenie nazewnictwa z definicją danych zawartą w schemie XML.

### 2. Struktura danych

- Struktura danych interfejsu FA odzwierciedla strukturę danych źródłowych pliku XML, zachowując ich logiczne powiązania
  i hierarchię
  w bardziej czytelnej formie.

### 3. Typy i interfejsy

- Typy odzwierciedlają strukturę danych pobieranych z XML faktur oraz ułatwiają generowanie PDF
- Typy i interfejsy są definiowane w folderze types oraz plikach z rozszerzeniem types.ts.

---

## Dokumentacja używanych narzędzi

- Vitest Docs — https://vitest.dev/guide/
- Vite Docs — https://vitejs.dev/guide/
- TypeScript Handbook — https://www.typescriptlang.org/docs/

---

## Uwagi

- Upewnij się, że pliki XML są poprawnie sformatowane zgodnie z odpowiednią schemą.
- W przypadku problemów z Node.js, rozważ użycie menedżera wersji Node, np. [nvm](https://github.com/nvm-sh/nvm).

## 6. Tryb CLI (Node.js)

Po zbudowaniu biblioteki możesz uruchamiać konwersję XML -> PDF z linii poleceń:

```bash
npm run cli -- --input assets/invoice.xml --output-dir ./out --nr-ksef "KSEF-123" --qr-code "https://example.local/qr"
```

### Konwersja wielu plików

```bash
npm run cli -- --input-dir ./input --output-dir ./out
```

### Przekazywanie `additionalData` (np. `nrKSeF`, `qrCode`)

Najprościej przez dedykowane flagi:

```bash
npm run cli -- --input assets/invoice.xml --output-dir ./out --nr-ksef "KSEF-123" --qr-code "https://twoj-link-qr"
```

Jeśli chcesz przekazać dodatkowe pola (np. `isMobile`), możesz dodać JSON:

```bash
npm run cli -- --input assets/invoice.xml --output-dir ./out --nr-ksef "KSEF-123" --additional-data-json '{"isMobile":true}'
```


Dla wielu plików możesz przekazać inny zestaw `additionalData` per XML przez mapę:

```bash
npm run cli -- --input assets/invoice-a.xml,assets/invoice-b.xml --output-dir ./out \
  --additional-data-map-json '{"invoice-a.xml":{"nrKSeF":"KSEF-A","qrCode":"https://qr/a"},"invoice-b.xml":{"nrKSeF":"KSEF-B","qrCode":"https://qr/b"}}'
```

Mapowanie działa po **nazwie pliku** (`invoice-a.xml`) albo po **pełnej ścieżce**.



### Automatyczne wyciąganie danych QR (KOD I)

CLI automatycznie wylicza link QR KOD I wg dokumentacji KSeF:
- `https://qr.ksef.mf.gov.pl/invoice/{NIP}/{DD-MM-RRRR}/{SHA256_Base64URL}`
- bez parsowania XML — wszystkie dane wejściowe (poza hashem) są pobierane z nazwy pliku
- skrót SHA-256 liczony z całej zawartości pliku XML

Wymagany format nazwy pliku:
- `KSEF_NIP_DATA_ID.xml`, np. `KSEF_5555555555-20250808-9231003CA67B-BE.xml`
- `NIP` -> 10 cyfr
- `DATA` -> `RRRRMMDD`, konwertowane do `DD-MM-RRRR` w linku QR
- `ID` -> dowolny identyfikator (w tym przebiegu nieużywany)

`nrKSeF` jest automatycznie ustawiane na `NIP-DATA-ID` (czyli fragment po `KSEF_` i przed `.xml`).

Ręczne flagi `--nr-ksef`, `--qr-code`, `--additional-data-json` i `--additional-data-map-json` nadal działają i nadpisują wartości automatyczne.

### Tryb nasłuchiwania katalogu

```bash
npm run cli -- --input-dir ./input --output-dir ./out --watch
```

W trybie `--watch` każde nowe XML dodane do katalogu wejściowego zostanie automatycznie przetworzone.

## 7. Docker (np. Synology)

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
