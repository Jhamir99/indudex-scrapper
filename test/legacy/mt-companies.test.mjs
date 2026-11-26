// The legacy's test/mt-companies.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T009): its imports pointed at
// this repo.
// The offer's company kept as the title writes it (builder/mt/companies.ts).
import { test } from "vitest";
import assert from "node:assert/strict";
import {
  companyCore,
  companySpan,
  companyBack,
  hideCompany,
  showCompany,
  MARK,
  COMMON,
} from "../../src/features/title-translation/method/companies.ts";

test("the legal form is left out of the field, and kept where the title writes it", () => {
  assert.equal(companyCore("Wien Energie GmbH"), "Wien Energie");
  assert.equal(
    companyCore("GOB Software & Systeme GmbH & Co. KG"),
    "GOB Software & Systeme",
  );
  assert.equal(
    companySpan(
      "Cybersecurity Engineer – Wien Energie GmbH",
      "Wien Energie",
      0,
    ),
    "Wien Energie GmbH",
  );
  assert.equal(
    companySpan(
      "IT-Systemadministrator Business Applications – GOB Software & Systeme GmbH & Co. KG",
      "GOB Software & Systeme GmbH & Co. KG",
      0,
    ),
    "GOB Software & Systeme GmbH & Co. KG",
  );
  assert.equal(
    companySpan(
      "Montagetechniker bei Schattenmacher Sonnenschutztechnik e.K.",
      "Schattenmacher Sonnenschutztechnik e.K.",
      0,
    ),
    "Schattenmacher Sonnenschutztechnik e.K.",
  );
});

test("the name as the title writes it, in its capitals", () => {
  assert.equal(
    companySpan(
      "Kolonnenführer - SCHWARZ GERÜSTBAU",
      "Schwarz Gerüstbau GmbH",
      0,
    ),
    "SCHWARZ GERÜSTBAU",
  );
  assert.equal(
    companySpan("Ingeniero Eléctrico Junior Otis Leganés", "OTIS", 1),
    "Otis",
  );
});

test("a field holding a job or a field, or the whole title, is no name", () => {
  assert.equal(
    companySpan(
      "Servicetechniker Aufzugstechnik – Raum Berlin",
      "Aufzugstechnik",
      COMMON,
    ),
    "",
  );
  assert.equal(
    companySpan("Werfleider Afbraakwerken", "Werfleider Afbraakwerken", 0),
    "",
  );
  assert.equal(companySpan("Elektriker (m/w/d)", "AB", 0), "");
  assert.equal(companySpan("Elektriker (m/w/d)", "Müller Elektro", 0), "");
});

test("written back in its capitals, accents and hyphens", () => {
  assert.equal(
    companyBack("Engineer at wien energie GmbH", "Wien Energie GmbH"),
    "Engineer at Wien Energie GmbH",
  );
  assert.equal(
    companyBack("Foreman at SCHWARZ GERUSTBAU", "SCHWARZ GERÜSTBAU"),
    "Foreman at SCHWARZ GERÜSTBAU",
  );
  assert.equal(
    companyBack("Data Scientist – TV Insight", "TV-Insight"),
    "Data Scientist – TV-Insight",
  );
  assert.equal(
    companyBack("Data Scientist – Insight", "TV-Insight"),
    "Data Scientist – Insight",
  );
});

test("set aside behind a mark and given back", () => {
  const hidden = hideCompany("Elektriker bei Auto Röhr Grafenau", "Auto Röhr");
  assert.equal(hidden, `Elektriker bei ${MARK} Grafenau`);
  assert.equal(
    showCompany(hidden, "Auto Röhr"),
    "Elektriker bei Auto Röhr Grafenau",
  );
  assert.equal(
    hideCompany("Contiweb, Engineer – Contiweb BV", "Contiweb"),
    `${MARK}, Engineer – ${MARK} BV`,
  );
  assert.equal(
    hideCompany("Data Scientist – TV Insight", "TV-Insight"),
    `Data Scientist – ${MARK}`,
  );
});

test("the company is found with a dash put between its words", () => {
  const t = "Vehicle damage assessor graduate - ALLIANCE EXPERTS – NORD OUEST";
  assert.equal(
    showCompany(
      hideCompany(t, "ALLIANCE EXPERTS NORD OUEST"),
      "ALLIANCE EXPERTS NORD OUEST",
    ),
    "Vehicle damage assessor graduate - ALLIANCE EXPERTS NORD OUEST",
  );
});

test("a company field longer than the name the title uses: legal forms, country and line of business left out", () => {
  for (const [title, field, span] of [
    [
      "Técnico de Mantenimiento - Leroy Merlin",
      "Leroy Merlin España S.L.U.",
      "Leroy Merlin",
    ],
    ["Técnico Aena", "AENA S.M.E., S.A.", "Aena"],
    ["Ingeniero Indra", "Indra Sistemas S.A.", "Indra"],
    ["Monteur Siemens AG", "Siemens Aktiengesellschaft", "Siemens AG"],
    ["Operario Acciona", "ACCIONA CONSTRUCCION SA", "Acciona"],
  ])
    assert.equal(companySpan(title, field, 0), span, title);
});
