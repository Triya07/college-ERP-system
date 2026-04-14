const mysql = require("mysql2/promise");

async function resetDatabase() {
  const db = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: process.env.DB_PASSWORD || "1972001Prachi@",
    database: "college_erp",
    port: 3306
  });

  const tables = [
    "course_registration_request",
    "notification",
    "announcement",
    "fee_record",
    "timetable_entry",
    "attendance",
    "result",
    "student_course",
    "course",
    "faculty",
    "admin",
    "student",
    "user"
  ];

  try {
    const [existingRows] = await db.query("SHOW TABLES");
    const existingTableSet = new Set(
      existingRows.map((row) => Object.values(row)[0])
    );
    const existingTables = tables.filter((table) => existingTableSet.has(table));

    await db.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const table of existingTables) {
      await db.query(`TRUNCATE TABLE ${table}`);
    }
    await db.query("SET FOREIGN_KEY_CHECKS = 1");

    const [rows] = await Promise.all(
      existingTables.map(async (table) => {
        const [countRows] = await db.query(`SELECT COUNT(*) AS cnt FROM ${table}`);
        return { tbl: table, cnt: countRows[0].cnt };
      })
    );

    console.table(rows);
    console.log("Database reset complete.");
  } finally {
    await db.end();
  }
}

resetDatabase().catch((err) => {
  console.error("Database reset failed:", err.message);
  process.exit(1);
});
