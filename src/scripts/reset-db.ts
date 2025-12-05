import "dotenv/config";
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

const sql = postgres(process.env.DATABASE_URL);

async function main() {
  console.log("Dropping all tables...");
  await sql`DROP SCHEMA public CASCADE;`;
  await sql`CREATE SCHEMA public;`;
  await sql`GRANT ALL ON SCHEMA public TO public;`;
  await sql`COMMENT ON SCHEMA public IS 'standard public schema';`;
  console.log("Tables dropped and public schema recreated.");
  await sql.end();
}

main().catch((err) => {
  console.error("Reset failed!");
  console.error(err);
  process.exit(1);
});
