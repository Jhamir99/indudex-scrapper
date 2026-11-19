import { describe, expect, it } from "vitest";
import {
  currentPositions,
  positionProblems,
  readPositionsRecord,
} from "./positions.js";

const recorded = { degrees: ["mechanical", "electrical", "civil"] };

describe("positions (FR-4)", () => {
  it("the catalogues keep every recorded entry in its place, and every entry is recorded", async () => {
    const { positions } = await readPositionsRecord();
    expect(positionProblems(positions, await currentPositions())).toEqual([]);
  });

  it("finds an entry moved", () => {
    expect(
      positionProblems(recorded, {
        degrees: ["mechanical", "civil", "electrical"],
      }),
    ).toEqual([
      'degrees: position 1 was "electrical", is "civil"',
      'degrees: position 2 was "civil", is "electrical"',
    ]);
  });

  it("finds an entry removed or renamed", () => {
    expect(
      positionProblems(recorded, { degrees: ["mechanical", "electrical"] }),
    ).toEqual(['degrees: position 2 was "civil", is gone']);
    expect(
      positionProblems(recorded, {
        degrees: ["mechanical", "electric", "civil"],
      }),
    ).toEqual(['degrees: position 1 was "electrical", is "electric"']);
  });

  it("takes an entry appended once the record is extended", () => {
    const appended = { degrees: [...recorded.degrees, "naval"] };
    expect(positionProblems(recorded, appended)).toEqual([
      "degrees: naval added but not recorded",
    ]);
    expect(positionProblems(appended, appended)).toEqual([]);
  });

  it("finds a list gone or never recorded", () => {
    expect(positionProblems(recorded, { vetoes: ["sales"] })).toEqual([
      "vetoes: not recorded",
      "degrees: recorded but gone",
    ]);
  });
});
