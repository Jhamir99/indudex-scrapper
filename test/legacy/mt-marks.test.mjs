// The legacy's mt-marks.test.mjs (JustJans/indudex@b0cd182), its imports pointed at this repo.
// A Spanish or Catalan title's gender marks given back to its translation into the other (builder/mt/marks.ts), in the
// shapes of Spain's published titles of 8 November 2026.
import { harness } from "./harness.mjs";
import {
  MARKED,
  withMarks,
} from "../../src/features/title-translation/method/marks.ts";
import { applyTitles } from "./translate-shim.mjs";

const { eq, done } = harness("mt-marks");

eq(
  [
    withMarks("Enginyer de processos - Sector Químic", "ca"),
    withMarks("Tècnic Superior Enginyer D'automoció", "ca"),
    withMarks("Enginyer civil – Cap de projecte", "ca"),
    withMarks("Operari de manteniment", "ca"),
    withMarks("Encarregat d'obra", "ca"),
    withMarks("Arquitecte Tècnic o Enginyer Tècnic", "ca"),
    withMarks("TÈCNIC DE MANTENIMENT", "ca"),
  ],
  [
    "Enginyer/a de processos - Sector Químic",
    "Tècnic/a Superior Enginyer/a D'automoció",
    "Enginyer/a civil – Cap de projecte",
    "Operari/ària de manteniment",
    "Encarregat/ada d'obra",
    "Arquitecte/a Tècnic/a o Enginyer/a Tècnic/a",
    "TÈCNIC/A DE MANTENIMENT",
  ],
  "Catalan: the persons each part opens with, not a part that names a field, nor an invariable word",
);
eq(
  [
    withMarks("Técnico de mantenimiento eléctrico", "es"),
    withMarks("Ingeniero mecánico y de automatización", "es"),
    withMarks("Delineante, arquitecto técnico o arquitecto", "es"),
    withMarks("Responsable de producción", "es"),
    withMarks("Electricista industrial", "es"),
  ],
  [
    "Técnico/a de mantenimiento eléctrico",
    "Ingeniero/a mecánico/a y de automatización",
    "Delineante, arquitecto/a técnico/a o arquitecto/a",
    "Responsable de producción",
    "Electricista industrial",
  ],
  "Spanish: the field after the link word keeps its own gender, invariable words stay",
);
eq(
  [
    "Ingeniero/a de procesos",
    "Tècnic/a",
    "Operari/ària",
    "Técnico(a)",
    "Senior Engineer",
    "I+D/a",
  ].map((t) => MARKED.test(t)),
  [true, true, true, true, false, false],
  "a mark written in a title",
);

// The build marks a translation only where its Spanish or Catalan title wrote marks and it has none.
const recs = [
  { t: "Ingeniero/a de Procesos", cc: "es", l: "Tarragona" },
  { t: "Técnico de mantenimiento", cc: "es", l: "Madrid" },
  { t: "Diseñador/a Industrial", cc: "es", l: "Valencia" },
];
applyTitles(recs, {
  target: "ca",
  cache: new Map([
    ["Ingeniero/a de Procesos", "Enginyer de processos"],
    ["Técnico de mantenimiento", "Tècnic de manteniment"],
    ["Diseñador/a Industrial", "Dissenyador/a industrial"],
  ]),
});
eq(
  recs.map((r) => r.tc),
  [
    "Enginyer/a de processos",
    "Tècnic de manteniment",
    "Dissenyador/a industrial",
  ],
  "marked where the title was and the translation is not",
);

done();
