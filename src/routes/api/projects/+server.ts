import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as dbService from "$lib/server/db/service";

export const GET: RequestHandler = async () => {
  const projects = await dbService.getProjects();
  return json(projects);
};

export const POST: RequestHandler = async ({ request }) => {
  const data = await request.json();
  const project = await dbService.createProject(data);
  return json(project, { status: 201 });
};
