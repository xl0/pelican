import { writeFile, mkdir, readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import dbg from "debug";

const debug = dbg("app:server:fs");

const ARTIFACTS_DIR = "./artifacts/projects";

async function ensureDir(path: string) {
  if (!existsSync(path)) {
    await mkdir(path, { recursive: true });
  }
}

export async function saveReferenceImage(
  projectId: number,
  data: string,
  extension: string,
): Promise<string> {
  debug("Saving reference image for project %d", projectId);

  const projectDir = join(ARTIFACTS_DIR, projectId.toString());
  await ensureDir(projectDir);

  const filePath = join(projectDir, `reference.${extension}`);
  const buffer = Buffer.from(data, "base64");

  await writeFile(filePath, buffer);
  debug("Reference image saved to %s", filePath);

  return filePath;
}

export async function saveArtifact(
  projectId: number,
  stepNumber: number,
  content: string,
  format: "svg" | "ascii" | "png",
  isBase64: boolean = false,
): Promise<string> {
  debug("Saving artifact for project %d, step %d", projectId, stepNumber);

  const projectDir = join(ARTIFACTS_DIR, projectId.toString());
  await ensureDir(projectDir);

  const extension = format === "svg" ? "svg" : format === "png" ? "png" : "txt";
  const filePath = join(projectDir, `gen_${stepNumber}.${extension}`);

  if (isBase64) {
    const buffer = Buffer.from(content, "base64");
    await writeFile(filePath, buffer);
  } else {
    await writeFile(filePath, content, "utf-8");
  }
  debug("Artifact saved to %s", filePath);

  return filePath;
}

export async function readArtifact(path: string): Promise<string> {
  debug("Reading artifact from %s", path);

  if (!existsSync(path)) {
    throw new Error(`Artifact not found: ${path}`);
  }

  return await readFile(path, "utf-8");
}

export async function deleteProjectArtifacts(projectId: number): Promise<void> {
  debug("Deleting artifacts for project %d", projectId);

  const projectDir = join(ARTIFACTS_DIR, projectId.toString());

  if (!existsSync(projectDir)) {
    debug("Project directory does not exist, nothing to delete");
    return;
  }

  const { rm } = await import("fs/promises");
  await rm(projectDir, { recursive: true, force: true });

  debug("Project artifacts deleted");
}
