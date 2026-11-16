import { brz } from "../public-feeds/adapters/brz/brz.js";
import { infopraca } from "../public-feeds/adapters/infopraca/infopraca.js";
import { island } from "../public-feeds/adapters/island/island.js";
import { jobindex } from "../public-feeds/adapters/jobindex/jobindex.js";
import { jobtech } from "../public-feeds/adapters/jobtech/jobtech.js";
import { kuntarekry } from "../public-feeds/adapters/kuntarekry/kuntarekry.js";
import { mpsv } from "../public-feeds/adapters/mpsv/mpsv.js";
import { nva } from "../public-feeds/adapters/nva/nva.js";
import { solidjobs } from "../public-feeds/adapters/solidjobs/solidjobs.js";
import { upsvr } from "../public-feeds/adapters/upsvr/upsvr.js";
import { valtiolle } from "../public-feeds/adapters/valtiolle/valtiolle.js";
import type { SourceAdapter } from "./ports.js";

// Every source the scrapper runs, in no particular order (the runner decides when each runs).
// The source features add their adapters here; each one must pass the shared contract test
// (`registry.test.ts`) with its saved responses in `test/fixtures/<id>/` (FR-12).
export const registeredAdapters: readonly SourceAdapter[] = [
  brz,
  infopraca,
  island,
  jobindex,
  jobtech,
  kuntarekry,
  mpsv,
  nva,
  solidjobs,
  upsvr,
  valtiolle,
];
