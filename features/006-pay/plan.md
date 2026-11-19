# Plan: Pay

Implements `spec.md` (FR-1 to FR-9). Status: draft (2026-11-19). A port of the legacy `builder/pay.mjs` (364 lines), `builder/text-pay.mjs` (437) and `builder/exchange-rates.mjs` (53), with their tests (`test/pay.test.mjs`, 572 lines; `test/text-pay.test.mjs`, 525), the adapters' pay helpers and the JobPosting `salaryOf` (`builder/lib/crawl.mjs`). Part A (T001-T004) covers what the source states and the rates; part B (T005-T009) the readers.

## 1. Layout

```
src/shared/schemas/advert.ts       # gains pay (FR-1)
src/shared/kit/job-posting.ts      # JobPosting gains its baseSalary as a pay field (infopraca)
src/features/public-feeds/adapters/<id>/   # the seven adapters that fill pay
src/shared/words/                  # moved from advert-facts/words: pay needs words('net'), words('gross'), the units
src/shared/kit/sentences.ts        # moved from advert-facts/sentences.ts: pay reads sentences too
src/shared/rates/ecb.ts            # ECB_URL, parseEcbRates, isWhole: what both sides agree a rates file is
src/shared/storage/kept-rates.ts   # <store>/rates/ecb.xml: keep (atomic) and read
src/features/crawl-core/rates.ts   # refreshRates: once a day, in the crawl run (FR-2)
src/features/pay/
  index.ts             # public entry: createPayReader, AdvertPay, PayPeriod
  periods.ts           # periodOf, the period words, PER_YEAR
  currencies.ts        # currencyOf: signs, words, «kr» by country, each country's own currency
  figures.ts           # a figure and a pay field as written (legacy figure, field)
  minimum-wages.ts     # the 2026 table, MINIMUM_WAGE_YEAR, periodByLaw, yearCalledMonth
  read-pay.ts          # readPay: the checks and the yearly figure (FR-7, FR-8)
  text/
    patterns.ts        # currencies, periods, ceiling, funds, statistics, net and gross, benefits
    pay-in-text.ts     # payInText: one line's figures, currency and period
    readers.ts         # labelled lines, pay sentences, gross figures, figures with their period, band lines, RAL, B2B
    pay-of-text.ts     # payOfText: title, then labels, then the readers (FR-5)
  advert-pay.ts        # field and text together (FR-6): one advert's AdvertPay
  *.test.ts
```

Moving `words` and `sentences` follows `AGENTS.md` ("Features"): one processor feature never imports another, so what both use moves to `src/shared/`. Advert facts imports them from there; its behaviour does not change.

## 2. The stored advert's pay (FR-1)

```ts
// in Advert (src/shared/schemas/advert.ts), optional, as the source gives it:
pay?: {
  min?: number | string;   // 1900, "1416", "£35,000 - £40,000": a positive number or the field's words (capped)
  max?: number | string;
  currency?: string;       // "EUR", "CZK", "€", "zł"
  period?: string;         // "month", "HOUR", "Mensual", "P1M"
  hoursPerWeek?: number;   // 0 < h <= 168
  partTime?: boolean;
}
```

- Strict, at least `min` or `max`; words capped at `SOURCE_FIELD_LIMIT`. Additive: the store's format version stays 1.
- The adapters give what their legacy adapters gave: `clm` (`clmPay`: «1.900 € / Mensual»), `feinaactiva` (min, max and the weekly hours from «(20 hores - jornada setmanal)»), `infopraca` (the page's JobPosting `baseSalary`, kept for adverts read before like its other detail fields), `nva` (from, to, and a period by Latvia's minimum, only for full-time «vesela» work), `mpsv` (monthly or hourly by `typMzdy`, with `pocetHodinTydne`), `uzt` (base or preliminary pay, the top, `valiuta`), `upsvr` (`zakladnaMzda`, month or hour).
- The pay lines some adapters already write into the text («Salario: …», «Základná mzda: …») stay, as 005 kept its lines: the text reader may read them, and the field wins over them (FR-6).
- `salaryOf` in `job-posting.ts`: the amount in `value` or `minValue`/`maxValue`, the period on the amount or the salary, the currency on the salary or the posting, part time when `employmentType` says only part time.

## 3. The ECB's rates (FR-2, FR-3)

- **Where kept:** `<store>/rates/ecb.xml`, the ECB's own file as fetched, written with `writeFileAtomic`. A new path in the store, so the format version stays 1; the layout comment at the top of `file-advert-store.ts` gains it.
- **When asked:** `crawl()` calls `refreshRates` once at the start of a run (also with `--source`), before the sources. It asks only when the kept file was not written today (its modification day, in UTC), so on a weekend the Friday file is not asked for hourly. The stop switch set: nothing asked. The ECB host's robots.txt allows `/stats/eurofxref/` and asks for a 5 s Crawl-delay, which `RobotsClient` and `PacedClient` already honour.
- **What replaces the kept file:** only a whole one (`isWhole`: a day, at least 25 currencies, USD, GBP, CHF, PLN and SEK above 0). Otherwise, and on any failure, the kept file stays and the run logs one line; the run goes on.
- **Read by the processor:** `readKeptRates(directory, today)` → `{ day, rates, warning? }`, rates as units of each currency for one euro, `EUR: 1` always; a warning when the file's day is more than seven days before `today` or there is no file (then only `EUR`).

## 4. The readers (FR-4 to FR-8)

- **Behaviour, not code**, as in 004 and 005: each legacy rule is a small named function or a commented branch with its _why_ and its dated measure (DAA-, NO2-, FUE- references kept as the legacy's own notes).
- **Golden sets.** The legacy's tests are run through the legacy's own readers in the scratchpad (`legacy-run/`, as in 005), and every reading is kept in `test/fixtures/pay/{fields,text}.json`; the port's tests check every one, plus the named examples written out as tests.
- **Regular expressions** follow the legacy's guard against slow patterns (DAA-27): fields capped before matching, no nested optional repetition, and a long text read around each pay word rather than whole.
- **The minimum wages** are the legacy's table of 1 January 2026, with `MINIMUM_WAGE_YEAR = 2026` and the legacy's test that fails when the year changes (DAA-30), so the table is renewed.

## 5. Public entry

```ts
createPayReader({ rates }): {
  pay(advert: StoredAdvert): AdvertPay | null;   // pure (FR-9)
}

AdvertPay = {
  low: number,          // the advert's own lowest figure; 0 for a ceiling a field states alone
  high: number,
  currency: string,     // ISO 4217
  period: "hour" | "day" | "week" | "month" | "year",
  from: "field" | "text",
  yearlyEur: number | null,   // the top in euros a year, to a hundred; null for part time by the hour, day or week with no hours
}
```

The legacy's record (`p: [min, max, currency, letter]`, `pa`) is the publication's (010) to write; here the period is a word.

## 6. Measurement and equivalence (T010)

A scratchpad script runs `createPayReader` over every advert of a store and the legacy's `readPay` + `payOfText` + its field-and-text choice (copied from `normalise.mjs`) over the same input, with the same rates, and reports per source the share with a pay from the field, from the text and with a yearly figure, the differences (expected none) and the time. The store is the fresh one of 005 (`<scratchpad>/store-facts`), passed again through the swept adapters so their pay fields are filled.

## 7. Decisions (2026-11-19, operator)

- **The pay field added to the stored advert.** Why: the legacy read the sources' pay fields first, and a figure read from its own field is surer than one read back from a line in the text. Additive, so the format stays at version 1.
- **The ECB's rates fetched by the scrapper and kept in the store.** Why: the processor never uses the network (`AGENTS.md`), and the crawl already runs hourly with the polite client; the legacy fetched them in its build and kept the last file the same way.
