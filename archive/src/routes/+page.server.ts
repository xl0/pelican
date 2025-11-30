import { db } from "$lib/server/db";
import { users } from "$lib/server/db/schema";

export const load = async () => {
  const allUsers = await db.select().from(users);
  return { users: allUsers };
};
