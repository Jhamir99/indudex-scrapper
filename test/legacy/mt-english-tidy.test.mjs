// The legacy's test/mt-english-tidy.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T009): its imports pointed at
// this repo.
// The English given to the second leg (builder/mt/english-tidy.ts): a dash after the job, so Firefox reads what follows as
// a part of the title and not as words of the job.
import { test } from "vitest";
import assert from "node:assert/strict";
import { jobDashEn } from "../../src/features/title-translation/method/english-tidy.ts";

test("a dash after the job, a leader and a hyphenated job too", () => {
  assert.equal(jobDashEn("Electrician Munich"), "Electrician – Munich");
  assert.equal(jobDashEn("Team leader machining"), "Team leader – machining");
  assert.equal(
    jobDashEn("Setter-operator CNC milling"),
    "Setter-operator – CNC milling",
  );
  assert.equal(jobDashEn("Team leader"), "Team leader");
});

test('no dash inside a name in capitals, nor before "and/or"', () => {
  assert.equal(
    jobDashEn("Vehicle damage assessor graduate - ALLIANCE EXPERTS NORD OUEST"),
    "Vehicle damage assessor graduate - ALLIANCE EXPERTS NORD OUEST",
  );
  assert.equal(
    jobDashEn("InduRec - Maintenance fitter and/or welder"),
    "InduRec - Maintenance fitter and/or welder",
  );
  assert.equal(
    jobDashEn("InduRec - Foreman Civil Engineering"),
    "InduRec - Foreman – Civil Engineering",
  );
});
