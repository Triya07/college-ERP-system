const mysql = require('mysql2/promise');

async function checkRollNumbers() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Prkvi@08',
    database: 'college_erp',
    port: 3306
  });

  try {
    const [students] = await connection.execute('SELECT student_id, name, roll_number FROM student WHERE roll_number IS NULL');
    console.log(`Students with NULL roll_number: ${students.length}`);
    if (students.length > 0) {
      console.log('Sample NULL students:', students.slice(0, 5));
    }

    const [faculty] = await connection.execute('SELECT faculty_id, name, roll_number FROM faculty WHERE roll_number IS NULL');
    console.log(`Faculty with NULL roll_number: ${faculty.length}`);
    if (faculty.length > 0) {
      console.log('Sample NULL faculty:', faculty.slice(0, 5));
    }

  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

checkRollNumbers();
