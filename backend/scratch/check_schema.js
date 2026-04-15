const mysql = require('mysql2/promise');

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Prkvi@08',
    database: 'college_erp',
    port: 3306
  });

  try {
    const [studentCols] = await connection.query('SHOW COLUMNS FROM student');
    console.log('--- Student Columns ---');
    console.table(studentCols);

    const [facultyCols] = await connection.query('SHOW COLUMNS FROM faculty');
    console.log('--- Faculty Columns ---');
    console.table(facultyCols);

    const [studentCount] = await connection.query('SELECT COUNT(*) AS count FROM student');
    const [facultyCount] = await connection.query('SELECT COUNT(*) AS count FROM faculty');
    console.log(`Current Counts: Students: ${studentCount[0].count}, Faculty: ${facultyCount[0].count}`);

  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

checkSchema();
