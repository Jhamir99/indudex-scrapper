import type { StoredAdvert } from "../../shared/schemas/advert.js";
import { contractOf } from "./contract.js";
import { workModeOf } from "./work-mode.js";

// Our typed shapes over the legacy's codes. The legacy's readers (contract.ts, work-mode.ts, labels.ts) answer in the
// letters its records carry: a contract «i», «t6», «e», «eo», «to», «p», «a»; a working time «c» or «p20»; a work mode
// «o», «h» or «r». The facts and the published offer read them through these.

export type ContractKind =
  | "permanent"
  | "temporary"
  | "agency"
  | "agency-to-permanent"
  | "temporary-to-permanent"
  | "training"
  | "freelance";

export interface Contract {
  readonly kind: ContractKind;
  readonly months?: number;
}

export interface WorkingTime {
  readonly kind: "full" | "part";
  readonly hours?: number;
}

export type WorkMode = "onsite" | "hybrid" | "remote";

const CONTRACT_KINDS: Readonly<Record<string, ContractKind>> = {
  i: "permanent",
  t: "temporary",
  e: "agency",
  eo: "agency-to-permanent",
  to: "temporary-to-permanent",
  p: "training",
  a: "freelance",
};
const WORK_MODES: Readonly<Record<string, WorkMode>> = {
  o: "onsite",
  h: "hybrid",
  r: "remote",
};

export function contractOfCode(code: string): Contract | null {
  const match = /^([a-z]+)(\d*)$/.exec(code);
  const kind = match ? CONTRACT_KINDS[match[1] ?? ""] : undefined;
  if (!kind) return null;
  return match?.[2] ? { kind, months: Number(match[2]) } : { kind };
}

export function workingTimeOfCode(code: string): WorkingTime | null {
  const match = /^([cp])(\d*)$/.exec(code);
  if (!match) return null;
  const kind = match[1] === "c" ? "full" : "part";
  return match[2] ? { kind, hours: Number(match[2]) } : { kind };
}

// The legacy's codes of a contract and a working time ("t6", "p20"), as the published offer writes them.
export const contractCode = (contract: Contract | null): string => {
  if (!contract) return "";
  const code =
    Object.entries(CONTRACT_KINDS).find(
      ([, kind]) => kind === contract.kind,
    )?.[0] ?? "";
  return contract.months ? `${code}${contract.months}` : code;
};
export const workingTimeCode = (time: WorkingTime | null): string =>
  time ? `${time.kind === "full" ? "c" : "p"}${time.hours ?? ""}` : "";

// An advert's contract and working time, each only when its source's fields say it (the legacy's `contractOf`).
export function statedContract(
  advert: Pick<
    StoredAdvert,
    "source" | "contract" | "hours" | "employmentType"
  > & {
    readonly description?: string;
  },
): {
  readonly contract: Contract | null;
  readonly workingTime: WorkingTime | null;
} {
  const { ct, wt } = contractOf(advert);
  return {
    contract: ct ? contractOfCode(ct) : null,
    workingTime: wt ? workingTimeOfCode(wt) : null,
  };
}

// An advert's work mode (the legacy's `workModeOf`), its source's `workMode` field first.
export const workModeOfAdvert = (
  advert: Pick<StoredAdvert, "workMode" | "title" | "location" | "description">,
): WorkMode | null =>
  WORK_MODES[
    workModeOf({
      title: advert.title,
      description: advert.description,
      location: advert.location,
      mode: advert.workMode,
    })
  ] ?? null;
