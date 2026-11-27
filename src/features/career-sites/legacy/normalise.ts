// The legacy's builder/normalise.ts `idFor` and `sameAddress` as the careers reader asks them: an offer's id is the one
// the publication gives its address (publication's `offerId`, by the same address rule), and two addresses of one page
// are one.
import { createHash } from "node:crypto";
import {
  advertAddress,
  sameAddress as same,
} from "../../../shared/kit/advert-address.js";

export const idFor = (url: unknown): string =>
  createHash("sha256")
    .update(advertAddress(String(url ?? "")))
    .digest("base64url")
    .slice(0, 8);
export const sameAddress = (url: unknown): string => same(String(url ?? ""));
