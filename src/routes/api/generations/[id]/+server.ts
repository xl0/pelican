import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as dbService from "$lib/server/db/service";

export const PATCH: RequestHandler = async ({ params, request }) => {
  const id = parseInt(params.id);
  const data = await request.json();

  if (data.completedAt) {
    data.completedAt = new Date(data.completedAt);
  }

  const generation = await dbService.updateGeneration(id, data);
  return json(generation);
};
