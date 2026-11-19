import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import type { z } from "@hono/zod-openapi";

const isInside = (directory: string, path: string) => {
  const fromDirectory = relative(directory, path);
  return (
    fromDirectory !== "" &&
    !fromDirectory.startsWith("..") &&
    !isAbsolute(fromDirectory)
  );
};

// Reads a file of a data folder (config/, catalogues/), and nothing outside it: no "..", no
// absolute path, no link leading out. `fail` builds the error the caller's readers expect.
export async function readInside(
  directory: string,
  fileName: string,
  fail: (message: string) => Error,
  folderName: string,
): Promise<string> {
  const path = resolve(directory, fileName);
  if (!isInside(resolve(directory), path))
    throw fail(`${fileName}: outside the ${folderName} folder`);

  let realPath: string;
  try {
    realPath = await realpath(path);
  } catch {
    throw fail(`${fileName}: not found in the ${folderName} folder`);
  }
  if (!isInside(await realpath(directory), realPath))
    throw fail(`${fileName}: outside the ${folderName} folder`);
  return readFile(realPath, "utf8");
}

// "file: path: message; path: message", the place of each problem in the file.
export function describeIssues(fileName: string, error: z.ZodError): string {
  const problems = error.issues.map(
    (issue) => `${issue.path.join(".") || "(top level)"}: ${issue.message}`,
  );
  return `${fileName}: ${problems.join("; ")}`;
}
