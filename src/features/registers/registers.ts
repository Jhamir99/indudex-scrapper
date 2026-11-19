import { readFile } from "node:fs/promises";
import type {
  RegisterCompany,
  RegisterId,
} from "../../shared/schemas/register.js";
import { writeRegister } from "../../shared/storage/registers-file.js";
import type { Clock, HttpClient, StopSwitch } from "../crawl-core/ports.js";
import { BRREG, readBrreg } from "./brreg.js";
import { DIBA, readDiba } from "./diba.js";
import { placer, readLau } from "./lau.js";
import { readSirene, SIRENE } from "./sirene.js";

// One register read into the store (companies FR-6), as the operator runs it.
export interface RegisterRun {
  readonly register: RegisterId;
  // The register's bulk files: Brønnøysund's enheter_alle.json.gz; Sirene's StockUniteLegale.zip
  // and StockEtablissement.zip; none for Barcelona's census, which is fetched.
  readonly files: readonly string[];
  // Eurostat's LAU table (TSV: country, NUTS 3, LAU code, name).
  readonly lau: string;
  readonly store: string;
  readonly http: HttpClient;
  readonly clock: Clock;
  readonly stopSwitch: StopSwitch;
  readonly log: (message: string) => void;
}

export class RegisterUsageError extends Error {
  override name = "RegisterUsageError";
}

const FILES: Readonly<Record<RegisterId, number>> = {
  brreg: 1,
  sirene: 2,
  diba: 0,
};
const TERMS = { brreg: BRREG, sirene: SIRENE, diba: DIBA } as const;

export async function runRegister(run: RegisterRun): Promise<string | null> {
  if (run.files.length !== FILES[run.register])
    throw new RegisterUsageError(
      `${run.register} takes ${FILES[run.register]} file(s), ${run.files.length} given`,
    );
  if (await run.stopSwitch.isActive()) {
    run.log(`${run.register}: the stop switch is set, nothing read`);
    return null;
  }
  const place = placer(readLau(await readFile(run.lau, "utf8")));
  const [first = "", second = ""] = run.files;
  let companies: RegisterCompany[];
  if (run.register === "brreg") companies = await readBrreg(first, place);
  else if (run.register === "sirene")
    companies = await readSirene(first, second, place);
  else companies = await readDiba(run.http, place, run.log);
  const path = await writeRegister(run.store, {
    version: 1,
    register: run.register,
    savedAt: run.clock.now().toISOString(),
    ...TERMS[run.register],
    companies,
  });
  run.log(
    `${run.register}: ${companies.length} companies, ${companies.filter((company) => company.nuts).length} placed → ${path}`,
  );
  return path;
}
