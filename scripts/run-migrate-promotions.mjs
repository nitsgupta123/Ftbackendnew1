import { config } from "dotenv";
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

config({ path: ".env.local" });
config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    multipleStatements: true,
  });

  try {
    const filename = "migrate-add-promotions.sql";
    const sql = fs.readFileSync(path.join(__dirname, filename), "utf8");
    console.log(`Running ${filename}...`);
    await connection.query(sql);
    console.log("Promotions tables are ready.");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Promotions migration failed:", error.message);
  process.exit(1);
});
