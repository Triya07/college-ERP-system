const mysql = require('mysql2/promise');

async function verifyMigration() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Prkvi@08',
    database: 'college_erp',
    port: 3306
  });

  try {
    const [s] = await connection.query('SELECT name, roll_number FROM student ORDER BY CAST(roll_number AS UNSIGNED)');
    console.log('--- Students ---');
    console.table(s);

    const [f] = await connection.query('SELECT name, roll_number FROM faculty ORDER BY CAST(roll_number AS UNSIGNED)');
    console.log('--- Faculty ---');
    console.table(f);
  } finally {
    await connection.end();
  }
}

verifyMigration();
