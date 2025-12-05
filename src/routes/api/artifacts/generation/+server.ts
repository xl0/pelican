import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as fsService from "$lib/server/fs/service";

export const POST: RequestHandler = async ({ request }) => {
  const { projectId, stepNumber, content, format, isBase64 } =
    await request.json();
  const path = await fsService.saveArtifact(
    projectId,
    stepNumber,
    content,
    format,
    isBase64,
  );
  return json({ path }, { status: 201 });
};
