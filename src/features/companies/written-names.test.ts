import { describe, expect, it } from "vitest";
import { writtenNames } from "./written-names.js";

const zeiss = (description: string, n: number) => ({
  company: "Zeissgroup",
  url: `https://zeissgroup.wd3.myworkdayjobs.com/x/job/${n}`,
  description,
});

describe("names as the adverts write them (companies FR-2)", () => {
  it("spells a name copied from the address as the adverts do", () => {
    expect([
      ...writtenNames([
        zeiss("Bei ZEISS Group arbeiten", 1),
        zeiss("ZEISS Group sucht", 2),
      ]),
    ]).toEqual([["Zeissgroup", "ZEISS Group"]]);
  });

  it("writes a name in capitals as the adverts do", () => {
    expect([
      ...writtenNames([
        {
          company: "JACKSON HOGG",
          url: "https://x.example/1",
          description: "Jackson Hogg is hiring",
        },
        {
          company: "REBOOT MONKEY",
          url: "https://x.example/2",
          description: "Reboot Monkey",
        },
        {
          company: "PROYECTOS ACO SL",
          url: "https://x.es/1",
          description: "Proyectos Aco SL busca",
        },
      ]),
    ]).toEqual([
      ["JACKSON HOGG", "Jackson Hogg"],
      ["REBOOT MONKEY", "Reboot Monkey"],
      ["PROYECTOS ACO SL", "Proyectos Aco SL"],
    ]);
  });

  it("keeps a name its adverts write as it stands, and needs two adverts to agree, or a source's only one", () => {
    expect([
      ...writtenNames([
        {
          company: "Manpower",
          url: "https://manpower.wd3.myworkdayjobs.com/1",
          description: "Manpower sucht",
        },
      ]),
    ]).toEqual([]);
    expect([
      ...writtenNames([
        zeiss("Bei ZEISS Group arbeiten", 1),
        zeiss("Bei Zeiss Group arbeiten", 2),
      ]),
    ]).toEqual([]);
    expect([
      ...writtenNames([
        zeiss("Bei ZEISS Group arbeiten", 1),
        zeiss("nothing", 2),
      ]),
    ]).toEqual([["Zeissgroup", "ZEISS Group"]]);
  });
});
