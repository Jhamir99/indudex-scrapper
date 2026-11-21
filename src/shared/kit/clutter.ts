// What a field carries that is no part of it (legacy builder/normalise.mjs, word for word but for
// types).

// Pictures and signs a title is decorated with, which the owner does not want shown (1 November 2026): emoji ("🛠️
// Électricien", "🔧 Chef de chantier"), with their joiners and variation marks, flags, and the marks left alone at
// either end of a title ("Dessinateur projeteur --/").
const PICTURES =
  // Modifiers, joiners and variation marks are listed on purpose, each taken out on its own.
  // oxlint-disable-next-line no-misleading-character-class
  /[\p{Extended_Pictographic}★☆✓✗✘\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}\u{FE0E}\u{FE0F}\u{20E3}\u{200D}]/gu;
export const withoutPictures = (t: unknown): string =>
  String(t || "")
    .replace(PICTURES, " ")
    .replace(/^(?:[\s\-–—/|\\_,:;*~=•·>]|\.(?!\p{L}))+(?=\S)/u, "")
    .replace(/\s+[-–—/|\\_,.:;*~=•·<]+$/u, "")
    .replace(/\s+/g, " ")
    .trim();

// What a field carries that is no part of it, found on the published offers of 1 November 2026: markup ("Müntener &
// Thomas<br>Personal…", 216 companies; «Gießen, <h6 style=…>», 77 places), a web address («… - www.meusburger.ch»), a
// phone number and a contact's name after an arrow ("Bei Interesse 0151-53591878", «--> Matthias Hüttner +49 711…»), a
// form's placeholders («null null null 2000 Antwerpen», «-, Deutschland», «Bydgoszcz, KP, PL, _»), pictures, and the
// marks left alone at either end.
// A tag starts with a letter, a slash or «!»: a «<» before a space or a figure is a sign of the title («Técnico BT < 1kV»).
const MARKUP = /<[a-z/!][^>]*>?|&lt;[\s\S]*$/gi;
const ADDRESS =
  /\s*(?:[-–|]\s*)?(?:https?:\/\/\S+|www\.[\w.-]+\.[a-z]{2,}\S*)/gi;
const PHONE =
  /\s*(?:(?:bei interesse|tel\.?|phone|whatsapp|call)\s*:?\s*)?(?:\+\d{1,3}[\s./-]?)?\(?\d{2,5}\)?(?:[\s./-]\d{2,8}){1,4}(?!\d)(?=\s|$|,)/gi;
const POINTER = /\s*-->[\s\S]*$/;
const PLACEHOLDERS = /(?:^|\s)(?:null|undefined)(?=\s|,|$)/gi;
// Control characters and writing-direction marks, which could draw a card backwards (NOA-19).
const CONTROLS =
  // oxlint-disable-next-line no-control-regex -- the control characters are what it takes out
  /[\u0000-\u0008\u000b-\u001f\u007f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;
// In a title, a phone only with its prefix or its label: bare figures there are a pay («40000-45000 € brutos», NOA-08).
const LABELLED = /^\s*(?:\+|bei interesse|tel|phone|whatsapp|call)/i;
export const withoutClutter = (
  s: unknown,
  { phones = true }: { readonly phones?: boolean | "labelled" } = {},
): string =>
  withoutPictures(
    String(s || "")
      .replace(CONTROLS, "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(MARKUP, " ")
      .replace(POINTER, "")
      .replace(ADDRESS, " ")
      .replace(phones ? PHONE : /$^/, (m: string) =>
        m.replace(/\D/g, "").length >= 9 &&
        (phones !== "labelled" || LABELLED.test(m))
          ? " "
          : m,
      )
      .replace(PLACEHOLDERS, " ")
      .replace(/[\u00a0\u202f]/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  )
    .replace(/^[-–—,;:|*#_\s]+(?=\S)/u, "")
    .replace(/(?:[\s,;:|*_-]|(?<![\p{L}+])#)+$/u, "")
    .trim(); // «C#» keeps its sign (NOA-08)
