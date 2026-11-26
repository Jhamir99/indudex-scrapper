// ➤ The French contracts (CDI, CDD, intérim), which Firefox copies as they are: named in English once, in the English
// ➤ the second leg reads, so every language writes its own name from the glossary (trades-data.ts).
// The legacy's builder/mt/contracts.ts (JustJans/indudex@ec79858), copied (legacy resync T009): only its imports and data reads
// changed. Its own comments keep their marks.

// ➤ Not Customer Due Diligence nor Customer Data Integration («KYC CDD Analyst», «MDM / CDI»).
const CUSTOMER = /\b(?:KYC|AML|MDM|[Dd]ue [Dd]iligence|[Cc]ustomer [Dd]ata)\b/;
const NAMES = {
  CDI: "Permanent contract",
  CDD: "Fixed-term contract",
  Interim: "Agency work",
};
// ➤ Only where it ends a part: not «CDD Analyst» nor «CDI Engineer»; after a word, behind a dash ("Tuyauteur CDD"
// ➤ came back "Pipe fitter Fixed-term contract", "en CDI" "on Permanent contract").
const CONTRACT =
  /(^|\s*[(–|-]\s*|\/|\s+(?:(?:on|in|en)\s+)?)\b(CDI|CDD|Interim)\b(?=\s*(?:$|[)–|,/]|-\s|\d))/g;

// ➤ «Interim» only from French, where it is agency work and not the acting post English means («Interim Manager»).
export function contractsNamed(english: string, fromFrench: boolean): string {
  if (CUSTOMER.test(english)) return english;
  return english.replace(CONTRACT, (m, lead: string, c: keyof typeof NAMES) =>
    c === "Interim" && !fromFrench
      ? m
      : (lead && !/[(–|/-]/.test(lead) ? " – " : lead) + NAMES[c],
  );
}

// ➤ A title naming a CDI or CDD, which only the English names.
export const namesContract = (title: string): boolean =>
  contractsNamed(title, false) !== title;
