import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { RegisterFile } from "../schemas/register.js";
import {
  readRegisters,
  REGISTERS_FOLDER,
  RegisterFileError,
  writeRegister,
} from "./registers-file.js";

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "indudex-store-"));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

const brreg: RegisterFile = {
  version: 1,
  register: "brreg",
  savedAt: "2026-11-19T20:00:00.000Z",
  licence: "NLOD 2.0",
  credit: "Brønnøysundregistrene",
  companies: [
    {
      id: "912345678",
      name: "SANDNES ELEKTRISKE AS",
      country: "no",
      town: "Sandnes",
      nuts: "NO0A2",
      nace: "4321",
      people: 40,
      website: "https://sandnes-elektriske.no",
    },
    {
      id: "998877665",
      name: "UTENLANDSK FILIAL NUF",
      country: "no",
      town: "",
      nuts: "",
      nace: "7112",
      people: 12,
    },
  ],
};

describe("the registers' companies in the store (companies FR-6)", () => {
  it("reads nothing before the tool has run", async () => {
    expect(await readRegisters(directory)).toEqual([]);
  });

  it("writes a register's file and reads its placed companies, with the register", async () => {
    const path = await writeRegister(directory, brreg);
    expect(path).toBe(join(directory, REGISTERS_FOLDER, "brreg.json"));
    expect(await readRegisters(directory)).toEqual([
      { ...brreg.companies[0], register: "brreg" },
    ]);
  });

  it("refuses a file that is not a register's, naming it", async () => {
    await mkdir(join(directory, REGISTERS_FOLDER), { recursive: true });
    await writeFile(
      join(directory, REGISTERS_FOLDER, "sirene.json"),
      JSON.stringify({ version: 1, register: "sirene" }),
    );
    await expect(readRegisters(directory)).rejects.toThrow(RegisterFileError);
    await expect(readRegisters(directory)).rejects.toThrow(/sirene\.json/);
  });

  it("refuses a person's record shape before writing (no unknown fields)", async () => {
    await expect(
      writeRegister(directory, {
        ...brreg,
        companies: [{ ...brreg.companies[0], owner: "Ola Nordmann" } as never],
      }),
    ).rejects.toThrow(/owner/);
  });
});
