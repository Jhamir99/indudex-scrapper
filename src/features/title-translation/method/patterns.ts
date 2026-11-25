// Legacy builder/mt/patterns.ts (JustJans/indudex@b0cd182), word for word but for lint and paths.
// The patterns the title method builds its rules from: a term as a word of its own, built once and kept.
import { setFlagsFromString } from "node:v8";

// The method keeps thousands of patterns (every trade of every pair as a word of its own). Node 26's V8 compiles a
// pattern run often into machine code, and with these that code filled the heap: the legacy's own tests ran out of
// memory at 400 MB on Node 26 (23 November 2026), and pass with the patterns kept in V8's bytecode. Set before any
// pattern of the method is built; it holds for every pattern of the process. Enough for the tests and the
// publication; the translator, which runs every pattern over thousands of titles, starts Node with
// --regexp-interpret-all as well (src/bin/translate.ts).
setFlagsFromString("--no-regexp-tier-up");

const BS = String.fromCharCode(92);
const L = "[" + BS + "p{L}" + BS + "p{N}]";
// The patterns every title goes through (the glossary's terms, the product names) are built once and kept: built
// anew at every call, Node 20 compiled them again whenever two full collections had emptied its own cache, and in
// the server's translator a German title took four seconds instead of thirty milliseconds (28 October). A global
// one starts from the beginning at every call.
const built = new Map<string, RegExp>();
const once = (source: string, flags: string): RegExp => {
  let re = built.get(flags + source);
  if (!re) built.set(flags + source, (re = new RegExp(source, flags)));
  re.lastIndex = 0;
  return re;
};
const wordSource = (re: string) =>
  "(^|(?!" + L + ").)(" + re + ")(?=$|(?!" + L + ").)";
export const word = (re: string, f = "iu"): RegExp =>
  new RegExp(wordSource(re), f);
export const nameWord = (n: string): RegExp =>
  once(wordSource(escape(n)), "iu");
// A term counts only as a word of its own, not glued to another by a hyphen ("VVS-montør").
export const termWord = (re: string): RegExp =>
  once(
    "(^|(?!" +
      L +
      ").)(?<!" +
      L +
      "-)(" +
      re +
      ")(?=$|(?!" +
      L +
      ").)(?!-" +
      L +
      ")",
    "giu",
  );
export const escape = (n: string): string =>
  n.replace(/[.*+?^${}()|[\]\\/]/g, (c) => BS + c);
