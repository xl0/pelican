import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as dbService from "$lib/server/db/service";

export const POST: RequestHandler = async ({ request }) => {
  const data = await request.json();
  const generation = await dbService.createGeneration(data);
  return json(generation, { status: 201 });
};
