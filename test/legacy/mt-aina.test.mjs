// The legacy's mt-aina.test.mjs (JustJans/indudex@b0cd182), its imports pointed at this repo.
// Catalan straight from Spanish with Aina's model (builder/mt/aina.mjs): which titles go to it, what is hidden and checked,
// and when a title keeps the route through English. Aina is replaced by a stand-in translator, so these run without Python.
import { test } from "vitest";
import assert from "node:assert/strict";
import {
  writtenInSpanish,
  hide,
  show,
  keptWords,
  catalan,
} from "../../src/features/title-translation/aina.ts";
import { translateTitles } from "../../src/features/title-translation/legs.ts";

test("a title Firefox left mostly as it was is English, not Spanish", () => {
  assert.equal(
    writtenInSpanish(
      "Fresador CNC Heidenhain",
      "CNC milling machine operator Heidenhain",
    ),
    true,
    "names and codes do not count",
  );
  assert.equal(
    writtenInSpanish(
      "Técnico/a de mantenimiento - Villacastin",
      "Maintenance technician - Villacastin",
    ),
    true,
  );
  assert.equal(
    writtenInSpanish(
      "Remote: Online Data Analyst Spanish speakers in Spain",
      "Remote: Online Data Analyst Spanish speakers in Spain",
    ),
    false,
  );
  assert.equal(
    writtenInSpanish("Senior Data Ops Engineer", "Senior Data Ops Engineer"),
    false,
  );
});

test("names go behind stand-ins the title does not hold, longest first, and come back", () => {
  const h = hide("Consultor Microsoft Dynamics en Siemens Energy", [
    "Dynamics",
    "Microsoft Dynamics",
    "Siemens Energy",
  ]);
  assert.ok(
    !h.text.includes("Microsoft Dynamics") &&
      !h.text.includes("Siemens Energy"),
  );
  assert.ok(
    !h.back.some(([stand]) => stand === "Siemens"),
    "a stand-in the title holds is not used",
  );
  assert.equal(
    show(
      h.text.replace("Consultor", "Consultor de").replace(" en ", " a "),
      h.back,
    ),
    "Consultor de Microsoft Dynamics a Siemens Energy",
  );
});

test('a lost stand-in or a "⁇" keeps the route through English', () => {
  const h = hide("Desarrollador Java - Cream Consulting", ["Cream Consulting"]);
  assert.equal(show("KAKAKA - Desenvolupador Java", h.back), null);
  assert.equal(show(`Desenvolupador Java ⁇ ${h.back[0][0]}`, h.back), null);
});

test("capitalised words Spanish and Catalan titles write alike must come back, not words Catalan writes otherwise", () => {
  assert.deepEqual(keptWords("Técnico de Sistemas SAP en Weelde"), [
    "SAP",
    "Weelde",
  ]);
  assert.deepEqual(keptWords("Desarrollador de Software Senior"), []);
});

test('a title with "|", a part dropped, a town or a kept word lost, or given back as it was keeps the usual route', () => {
  const echo = (texts) =>
    texts.map((t) =>
      t.replace("Técnico", "Tècnic").replace("Ingeniero", "Enginyer"),
    );
  assert.deepEqual(
    catalan([{ text: "Técnico de soporte | Madrid", keep: [] }], echo),
    [null],
  );
  assert.deepEqual(
    catalan([{ text: "Ingeniero de procesos - Kammann", keep: [] }], (texts) =>
      texts.map((t) => t.split(" - ")[0]),
    ),
    [null],
  );
  assert.deepEqual(
    catalan(
      [{ text: "Técnico en Weelde", keep: [], words: ["Weelde"] }],
      () => ["Tècnic a Resca"],
    ),
    [null],
  );
  assert.deepEqual(
    catalan(
      [{ text: "Técnico en Palencia", keep: [], towns: ["Palencia"] }],
      () => ["Tècnic a Palència"],
    ),
    [null],
  );
  assert.deepEqual(
    catalan(
      [{ text: "Principal Mechanical Engineer – Madrid", keep: [] }],
      (texts) => texts,
    ),
    [null],
  );
  assert.deepEqual(
    catalan(
      [{ text: "Ingeniero de procesos - Kammann", keep: [], towns: [] }],
      echo,
    ),
    ["Enginyer de procesos - Kammann"],
  );
});

test("Aina keeps the usual route for a town the title does not name, a made-up title or one cut short (9 November 2026)", () => {
  const say = (out) => () => [out];
  assert.deepEqual(
    catalan(
      [
        {
          text: "Técnico/a Instalador/a de Televisores a domicilio Valladolid.",
          route: "Instal·lador Tècnic de Televisors a domicili Valladolid.",
        },
      ],
      say("Instal·lador/a de Televisors a domicili Lleida."),
    ),
    [null],
    "a town of Spain the title does not name",
  );
  assert.deepEqual(
    catalan(
      [
        {
          text: "Técnico de mantenimiento industrial en Lérida",
          route: "Tècnic de manteniment industrial a Lérida",
        },
      ],
      say("Tècnic de manteniment industrial a Lleida"),
    ),
    ["Tècnic de manteniment industrial a Lleida"],
    "the same town by its Catalan name",
  );
  assert.deepEqual(
    catalan(
      [{ text: "Profesionales Java", route: "Professionals Java" }],
      say("Formació Java"),
    ),
    [null],
    "far less like the Spanish than the route",
  );
  assert.deepEqual(
    catalan(
      [
        {
          text: "Técnico de Ascensores OTIS Coruña",
          route: "Tècnic d'ascensors OTIS Coruña",
        },
      ],
      say("Ascensores OTIS Coruña"),
    ),
    [null],
    "cut short",
  );
  assert.deepEqual(
    catalan(
      [{ text: "Ingeniero Naval", route: "Enginyer naval" }],
      say("Enginyer Naval"),
    ),
    ["Enginyer Naval"],
    "a word that is also a town is no town",
  );
  assert.equal(
    writtenInSpanish(
      "Software Developer Java - Remoto",
      "Java Software Developer - Remote",
    ),
    false,
    "English words with a capital count as English",
  );
});

test("a Spanish title's Catalan comes from Aina when it comes back whole, the rest's from the route through English", async () => {
  const TABLE = {
    "es-en": {
      "Operario de producción": "Production operator",
      "Data Engineer": "Data Engineer",
    },
    "en-ca": {
      "Production operator": "Operador de producció",
      "Data Engineer": "Enginyer de dades",
    },
  };
  const engine = {
    translate: async (pair, texts) => texts.map((t) => TABLE[pair]?.[t] ?? t),
    aina: (texts) =>
      texts.map((t) =>
        t === "Operario de producción" ? "Operari de producció" : t,
      ),
  };
  const out = await translateTitles(
    "es",
    ["Operario de producción", "Data Engineer"],
    { into: ["en", "ca"] },
    engine,
  );
  assert.equal(out.ca[0], "Operari de producció", "written in Spanish: Aina");
  assert.equal(
    out.ca[1],
    "Enginyer de dades",
    "written in English: the usual route",
  );
  const none = await translateTitles(
    "es",
    ["Operario de producción"],
    { into: ["ca"] },
    { ...engine, aina: null },
  );
  assert.equal(
    none.ca[0],
    "Operador de producció",
    "without Aina, the usual route",
  );
  const broken = await translateTitles(
    "es",
    ["Operario de producción"],
    { into: ["ca"] },
    {
      ...engine,
      aina: () => {
        throw new Error("no worker");
      },
    },
  );
  assert.equal(
    broken.ca[0],
    "Operador de producció",
    "a worker that fails keeps the usual route",
  );
});
