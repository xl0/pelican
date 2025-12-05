import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as dbService from "$lib/server/db/service";

export const GET: RequestHandler = async ({ params }) => {
  const id = parseInt(params.id);
  const project = await dbService.getProject(id);

  if (!project) {
    throw error(404, "Project not found");
  }

  return json(project);
};

export const PATCH: RequestHandler = async ({ params, request }) => {
  const id = parseInt(params.id);
  const data = await request.json();
  const project = await dbService.updateProject(id, data);
  return json(project);
};

export const DELETE: RequestHandler = async ({ params }) => {
  const id = parseInt(params.id);
  await dbService.deleteProject(id);
  return new Response(null, { status: 204 });
};
