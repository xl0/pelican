import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as fsService from "$lib/server/fs/service";

export const POST: RequestHandler = async ({ request }) => {
  const { projectId, data, extension } = await request.json();
  const path = await fsService.saveReferenceImage(projectId, data, extension);
  return json({ path }, { status: 201 });
};
