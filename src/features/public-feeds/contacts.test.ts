import { describe, expect, it } from "vitest";
import { withoutContacts } from "./contacts.js";

describe("withoutContacts", () => {
  it("cuts links, e-mail addresses and phone numbers", () => {
    expect(
      withoutContacts(
        "Escribe a rrhh@empresa.es o ion.pop @firma.ro, llama al 968 12 34 56 o +40 21 312 3456. www.empresa.es",
      ),
    ).toBe("Escribe a o , llama al o .");
  });

  it("keeps dates, years, pay and short numbers", () => {
    const text =
      "Contrato del 01/12/2026 al 28/02/2027, 1.550 € al mes, 40 horas, CP 30001";
    expect(withoutContacts(text)).toBe(text);
  });
});
