import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  type RegisterCompany,
  RegisterFile,
  type RegisterId,
} from "../schemas/register.js";
import { writeFileAtomic } from "./atomic.js";

// The registers' companies in the store (layout at the top of file-advert-store.ts):
// <store>/registers/<register>.json, written whole by the registers tool and read by the processor.
export const REGISTERS_FOLDER = "registers";

export class RegisterFileError extends Error {
  override name = "RegisterFileError";
}

export async function writeRegister(
  storeDirectory: string,
  file: RegisterFile,
): Promise<string> {
  const path = join(storeDirectory, REGISTERS_FOLDER, `${file.register}.json`);
  await writeFileAtomic(path, JSON.stringify(RegisterFile.parse(file)));
  return path;
}

export interface KeptRegisterCompany extends RegisterCompany {
  readonly register: RegisterId;
}

// Every register's companies kept in the store, each with the register it comes from, those
// placed in a province only (the legacy's readRegisters). None when the tool has not run.
export async function readRegisters(
  storeDirectory: string,
): Promise<KeptRegisterCompany[]> {
  const folder = join(storeDirectory, REGISTERS_FOLDER);
  let names: string[];
  try {
    names = (await readdir(folder))
      .filter((name) => name.endsWith(".json"))
      .toSorted();
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code === "ENOENT")
      return [];
    throw error;
  }
  const companies: KeptRegisterCompany[] = [];
  for (const name of names) {
    const path = join(folder, name);
    const result = RegisterFile.safeParse(
      JSON.parse(await readFile(path, "utf8")),
    );
    if (!result.success)
      throw new RegisterFileError(
        `${path}: ${result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`,
      );
    for (const company of result.data.companies)
      if (company.name && company.country && company.nuts)
        companies.push({ ...company, register: result.data.register });
  }
  return companies;
}
