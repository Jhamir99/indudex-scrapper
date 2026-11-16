import { anofm } from "../public-feeds/adapters/anofm/anofm.js";
import { brz } from "../public-feeds/adapters/brz/brz.js";
import { cyprus } from "../public-feeds/adapters/cyprus/cyprus.js";
import { hungary } from "../public-feeds/adapters/hungary/hungary.js";
import { hzz } from "../public-feeds/adapters/hzz/hzz.js";
import { iefp } from "../public-feeds/adapters/iefp/iefp.js";
import { infopraca } from "../public-feeds/adapters/infopraca/infopraca.js";
import { island } from "../public-feeds/adapters/island/island.js";
import { jobindex } from "../public-feeds/adapters/jobindex/jobindex.js";
import { jobtech } from "../public-feeds/adapters/jobtech/jobtech.js";
import { kuntarekry } from "../public-feeds/adapters/kuntarekry/kuntarekry.js";
import { mpsv } from "../public-feeds/adapters/mpsv/mpsv.js";
import { netempregos } from "../public-feeds/adapters/netempregos/netempregos.js";
import { nva } from "../public-feeds/adapters/nva/nva.js";
import { sef } from "../public-feeds/adapters/sef/sef.js";
import { solidjobs } from "../public-feeds/adapters/solidjobs/solidjobs.js";
import { spin } from "../public-feeds/adapters/spin/spin.js";
import { upsvr } from "../public-feeds/adapters/upsvr/upsvr.js";
import { valtiolle } from "../public-feeds/adapters/valtiolle/valtiolle.js";
import type { SourceAdapter } from "./ports.js";

// Every source the scrapper runs, in no particular order (the runner decides when each runs).
// The source features add their adapters here; each one must pass the shared contract test
// (`registry.test.ts`) with its saved responses in `test/fixtures/<id>/` (FR-12).
export const registeredAdapters: readonly SourceAdapter[] = [
  anofm,
  brz,
  cyprus,
  hungary,
  hzz,
  iefp,
  infopraca,
  island,
  jobindex,
  jobtech,
  kuntarekry,
  mpsv,
  netempregos,
  nva,
  sef,
  solidjobs,
  spin,
  upsvr,
  valtiolle,
];
