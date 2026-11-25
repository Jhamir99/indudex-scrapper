// The legacy's test/closed.test.mjs (JustJans/indudex), its imports pointed at this repo (closed adverts FR-1, FR-2).
// ➤ An advert whose own page says it is closed (docs/research/closed-offers.md).
import { harness } from "./harness.mjs";
import { saysClosed } from "../../src/features/gate/closed.ts";

const { eq, done } = harness("closed");
const says = (description) => saysClosed({ description });

eq(
  [
    "MojPosao Postavke kolačića Povratak Ovaj oglas nije aktivan. Prijava na njega nije moguća.",
    "CNC verspaner 32 tot 40 uur HBO, MBO Let op! Deze vacature is niet meer actief. Je kan hier niet meer op solliciteren.",
    "Pobierz Chrome Pobierz Safari Ta oferta jest już nieaktualna. Zobacz podobne oferty",
    "Systeembeheerder/Netwerkbeheerder Deze vacature is vervuld.",
    "Explore Connect Demo Contact This position is no longer available Position QA Engineer",
    "Consultant IT Security (m/w/d) Diese Stelle ist bereits besetzt.",
    "Développeur Frontend Cette offre n’est plus disponible.",
    "CNC-operatör sökes i Eskilstuna Tjänsten är tillsatt.",
    "Stillingen er besat.",
  ].map(says),
  [true, true, true, true, true, true, true, true, true],
  "the notices read on the pile of 30 October 2026",
);
eq(
  says("Développeur Frontend Cette offre n'est plus disponible."),
  true,
  "the French notice with a plain apostrophe too",
);
eq(
  [
    "Wir suchen Verstärkung für unser Team.",
    "We are hiring a PLC engineer to join us.",
    "Posición cubierta internamente en 2019; ahora buscamos un técnico.",
  ].map(says),
  [false, false, false],
  "an open advert",
);
eq(
  says(
    `${"Wir suchen Verstärkung für unser Team in München. ".repeat(60)}Diese Stelle ist leider nicht mehr verfügbar.`,
  ),
  false,
  "read near the top only: a notice far down belongs to another advert the page lists",
);

eq(
  [
    saysClosed({
      title: 'De vacature " Lasser " is intussen niet meer beschikbaar.',
      description: "x",
    }),
    saysClosed({
      title: "Technische/r Zeichner/in – bereits besetzt",
      description: "x",
    }),
    saysClosed({ title: "Technische/r Zeichner/in (m/w/d)", description: "x" }),
  ],
  [true, true, false],
  "a filled advert that says so in its title",
);

done();
