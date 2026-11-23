// The legacy's translate-audit.test.mjs (JustJans/indudex@b0cd182), its imports pointed at this repo.
// The translator's fixes from the audit (TRA-03 to TRA-16, TB2-01 to TB2-11): emojis that hung the method, entities, a
// cache that cannot be read, company names cut short, words read as towns, Catalan towns, «wanted» and capitals' prefixes.
import { test } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { before } from "../../src/features/title-translation/method/method.ts";
import { loadCache } from "./translate-shim.mjs";
import { companyCore } from "../../src/features/title-translation/method/companies.ts";
import { placesIn } from "../../src/features/title-translation/method/places.ts";
import { tidyEnglish } from "../../src/features/title-translation/method/english-tidy.ts";

test("a run of emojis at the start is set aside in linear time, and entities are decoded (TRA-03, TRA-16)", () => {
  before("de-en", "Monteur");
  const t = performance.now();
  assert.equal(
    before("de-en", `${"⚡".repeat(40)} Elektriker`).text,
    "Elektriker",
  );
  assert.ok(performance.now() - t < 1000);
  assert.equal(
    before(
      "fr-en",
      "Ing&#233;nieur &#x2013; R&amp;D &#99999999;",
    ).text.includes("Ingénieur – R&D"),
    true,
  );
});

test("a cache that is there and cannot be read is an error, none yet is empty (TRA-05)", () => {
  const dir = mkdtempSync(join(tmpdir(), "cache-"));
  assert.equal(loadCache(join(dir, "none.json")).size, 0);
  writeFileSync(join(dir, "cut.json"), '{"Monteur": "Fit');
  assert.throws(() => loadCache(join(dir, "cut.json")));
});

test("legal forms after a space only, and towns: no «Time», Vic and short Catalan names (TB2-07, TB2-09, TB2-11)", () => {
  assert.deepEqual(
    ["Lufthansa", "Endesa", "Sparkasse", "STRABAG SE", "Acme, S.L."].map(
      companyCore,
    ),
    ["Lufthansa", "Endesa", "Sparkasse", "STRABAG", "Acme"],
  );
  assert.deepEqual(
    [
      placesIn("Maintenance Engineer - Full Time"),
      placesIn("Operari a Vic"),
      placesIn("Tècnic a Sant Boi"),
    ],
    [[], ["Vic"], ["Sant Boi"]],
  );
});

test("«wanted» as a board writes it, and capitals before a prefix stay joined (TB2-05)", () => {
  assert.deepEqual(
    tidyEnglish([
      "Wanted: Electrician",
      "Most wanted welder",
      "CO-Founder and CTO",
      "HLS-Monteur Team",
    ]),
    [
      "Electrician",
      "Most wanted welder",
      "CO-Founder and CTO",
      "HLS Monteur Team",
    ],
  );
  assert.deepEqual(
    tidyEnglish(["Welders sought, Hamburg", "Engineers wanted in Leeds"]),
    ["Welders, Hamburg", "Engineers in Leeds"],
    "nor after the trade (regression of TB2-05)",
  );
});

test("corrections touch only their own words: «Aîné», CDI and CDD (TB2-01, TB2-03)", async () => {
  const { correct } =
    await import("../../src/features/title-translation/method/corrections.ts");
  assert.equal(
    correct("Ingénieur réseau Senior", "Ingénieur réseau Aîné", "fr"),
    "Ingénieur réseau Senior",
  );
  assert.equal(
    correct("Formador CCI Lyon (CDI)", "Formador CCI Lyon (CDI)", "es"),
    "Formador CCI Lyon (contrato indefinido)",
  );
  assert.equal(
    correct(
      "Enginyer CI/CD - CDD 6 mesos",
      "Enginyer CI/CD - CDD 6 mesos",
      "ca",
    ),
    "Enginyer CI/CD - contracte temporal 6 mesos",
  );
});
