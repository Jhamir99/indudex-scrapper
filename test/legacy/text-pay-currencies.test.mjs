// The legacy's test/text-pay-currencies.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T004): its imports pointed at
// this repo.
// ➤ A pay's currency written by its name (builder/text-pay.ts), not only by its sign or code.
import { harness } from "./harness.mjs";
import { payOfText } from "../../src/features/pay/text-pay.ts";

const { eq, done } = harness("text pay currencies");
const p = (title, text) => {
  const r = payOfText(title, text);
  return r ? [r.min, r.max, r.currency, r.period] : null;
};

// ➤ A currency written by its name, inflected; the Danish and Norwegian «kroner» is a crown, as «kr».
eq(
  [
    p("Svářeč", "Mzda 45 000 korun měsíčně."),
    p("Programista", "Wynagrodzenie 8000 złotych miesięcznie."),
    p("Villanyszerelő", "Bruttó 600 000 forint havonta."),
    p("Inginer", "Salariu 7000 de lei pe lună."),
    p("Ingenjör", "Lön 45 000 kronor i månaden."),
    p("Ingeniør", "Løn 45.000 kroner om måneden."),
    p("Ingenieur", "Lohn 3000 Franken im Monat."),
    p("Inženjer", "Plaća 2.000 eura mjesečno."),
    p("Insinööri", "Kuukausipalkka 3 000 euroa."),
  ],
  [
    [45000, 45000, "CZK", "month"],
    [8000, 8000, "PLN", "month"],
    [600000, 600000, "HUF", "month"],
    [7000, 7000, "RON", "month"],
    [45000, 45000, "SEK", "month"],
    [45000, 45000, "kr", "month"],
    [3000, 3000, "CHF", "month"],
    [2000, 2000, "EUR", "month"],
    [3000, 3000, "EUR", "month"],
  ],
  "a currency by its name",
);
// ➤ A band whose currency's name runs past the six characters after it (old: 50,000 alone, from «50 de mii de lei»).
eq(
  [
    p("Inginer", "Salariu între 40 și 50 de mii de lei pe an."),
    p("Inginer", "Tarif orar: 25 de euro."),
  ],
  [
    [40000, 50000, "RON", "year"],
    [25, 25, "EUR", "hour"],
  ],
  "a band before a long currency name",
);
done();
