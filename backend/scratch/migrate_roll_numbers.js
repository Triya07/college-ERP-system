const mysql = require('mysql2/promise');

async function migrateRollNumbers() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Prkvi@08',
    database: 'college_erp',
    port: 3306
  });

  try {
    console.log('Ensuring faculty roll_number column exists...');
    try {
      await connection.query('ALTER TABLE faculty ADD COLUMN roll_number VARCHAR(50) NULL UNIQUE');
      console.log('Added roll_number column to faculty table.');
    } catch (colErr) {
      if (colErr.code === 'ER_DUP_FIELDNAME') {
        console.log('faculty.roll_number column already exists.');
      } else {
        throw colErr;
      }
    }

    console.log('Starting roll number migration...');

    // 1. Migrate Students (Starting from 1)
    const [students] = await connection.query('SELECT student_id FROM student ORDER BY enrollment_date ASC, student_id ASC');
    console.log(`Migrating ${students.length} students...`);
    
    for (let i = 0; i < students.length; i++) {
      const rollNumber = (i + 1).toString();
      await connection.query('UPDATE student SET roll_number = ? WHERE student_id = ?', [rollNumber, students[i].student_id]);
    }
    console.log('Students migration complete.');

    // 2. Migrate Faculty (Starting from 101)
    const [faculty] = await connection.query('SELECT faculty_id FROM faculty ORDER BY created_at ASC, faculty_id ASC');
    console.log(`Migrating ${faculty.length} faculty...`);

    for (let i = 0; i < faculty.length; i++) {
      const rollNumber = (101 + i).toString();
      await connection.query('UPDATE faculty SET roll_number = ? WHERE faculty_id = ?', [rollNumber, faculty[i].faculty_id]);
    }
    console.log('Faculty migration complete.');

    console.log('✅ Roll number migration successfully finished.');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await connection.end();
  }
}

migrateRollNumbers();
