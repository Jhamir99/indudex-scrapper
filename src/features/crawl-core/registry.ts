import { actiris } from "../public-feeds/adapters/actiris/actiris.js";
import { anofm } from "../public-feeds/adapters/anofm/anofm.js";
import { bolzano } from "../public-feeds/adapters/bolzano/bolzano.js";
import { brandenburg } from "../public-feeds/adapters/brandenburg/brandenburg.js";
import { brescia } from "../public-feeds/adapters/brescia/brescia.js";
import { brz } from "../public-feeds/adapters/brz/brz.js";
import { bund } from "../public-feeds/adapters/bund/bund.js";
import { cyprus } from "../public-feeds/adapters/cyprus/cyprus.js";
import { emilia } from "../public-feeds/adapters/emilia/emilia.js";
import { forem } from "../public-feeds/adapters/forem/forem.js";
import { hungary } from "../public-feeds/adapters/hungary/hungary.js";
import { hzz } from "../public-feeds/adapters/hzz/hzz.js";
import { iefp } from "../public-feeds/adapters/iefp/iefp.js";
import { ifgat } from "../public-feeds/adapters/ifgat/ifgat.js";
import { infopraca } from "../public-feeds/adapters/infopraca/infopraca.js";
import { island } from "../public-feeds/adapters/island/island.js";
import { jobindex } from "../public-feeds/adapters/jobindex/jobindex.js";
import { jobtech } from "../public-feeds/adapters/jobtech/jobtech.js";
import { karrierenrw } from "../public-feeds/adapters/karrierenrw/karrierenrw.js";
import { kuntarekry } from "../public-feeds/adapters/kuntarekry/kuntarekry.js";
import { lanbide } from "../public-feeds/adapters/lanbide/lanbide.js";
import { linz } from "../public-feeds/adapters/linz/linz.js";
import { mpsv } from "../public-feeds/adapters/mpsv/mpsv.js";
import { netempregos } from "../public-feeds/adapters/netempregos/netempregos.js";
import { nva } from "../public-feeds/adapters/nva/nva.js";
import { ooe } from "../public-feeds/adapters/ooe/ooe.js";
import { sae } from "../public-feeds/adapters/sae/sae.js";
import { sef } from "../public-feeds/adapters/sef/sef.js";
import { sne } from "../public-feeds/adapters/sne/sne.js";
import { solidjobs } from "../public-feeds/adapters/solidjobs/solidjobs.js";
import { spin } from "../public-feeds/adapters/spin/spin.js";
import { trento } from "../public-feeds/adapters/trento/trento.js";
import { ttvic } from "../public-feeds/adapters/ttvic/ttvic.js";
import { upsvr } from "../public-feeds/adapters/upsvr/upsvr.js";
import { uzt } from "../public-feeds/adapters/uzt/uzt.js";
import { valtiolle } from "../public-feeds/adapters/valtiolle/valtiolle.js";
import { vdab } from "../public-feeds/adapters/vdab/vdab.js";
import type { SourceAdapter } from "./ports.js";

// Every source the scrapper runs, in no particular order (the runner decides when each runs).
// The source features add their adapters here; each one must pass the shared contract test
// (`registry.test.ts`) with its saved responses in `test/fixtures/<id>/` (FR-12).
export const registeredAdapters: readonly SourceAdapter[] = [
  actiris,
  anofm,
  bolzano,
  brandenburg,
  brescia,
  brz,
  bund,
  cyprus,
  emilia,
  forem,
  hungary,
  hzz,
  iefp,
  ifgat,
  infopraca,
  island,
  jobindex,
  jobtech,
  karrierenrw,
  kuntarekry,
  lanbide,
  linz,
  mpsv,
  netempregos,
  nva,
  ooe,
  sae,
  sef,
  sne,
  solidjobs,
  spin,
  trento,
  ttvic,
  upsvr,
  uzt,
  valtiolle,
  vdab,
];
