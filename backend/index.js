console.log("🔥 index.js started");

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// MySQL connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  // keep database password outside source control
  password: process.env.DB_PASSWORD || "1972001Prachi@",
  database: "college_erp",
  port: 3306

});

// Check database connection
db.connect((err) => {
  if (err) {
    console.log("❌ MySQL connection failed");
    console.log(err);
  } else {
    console.log("✅ Connected to MySQL database");
  }
});

const getResultSchema = (callback) => {
  const query = `
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'result'
  `;

  db.query(query, [db.config.database], (err, rows) => {
    if (err) {
      return callback(err);
    }

    const columns = rows.map((row) => row.COLUMN_NAME);

    callback(null, {
      idColumn: columns.includes("result_id")
        ? "result_id"
        : columns.includes("id")
        ? "id"
        : null,
      marksColumn: columns.includes("marks_obtained")
        ? "marks_obtained"
        : columns.includes("marks")
        ? "marks"
        : null,
      totalColumn: columns.includes("total_marks")
        ? "total_marks"
        : columns.includes("total")
        ? "total"
        : null
    });
  });
};

// ===== DATABASE SCHEMA NOTES =====
// Ensure your tables have the following structure:
// CREATE TABLE course (
//   course_id INT PRIMARY KEY AUTO_INCREMENT,
//   course_name VARCHAR(100) NOT NULL,
//   department VARCHAR(50)
// );
// 
// CREATE TABLE student (
//   student_id INT PRIMARY KEY AUTO_INCREMENT,
//   name VARCHAR(100),
//   department VARCHAR(50),
//   year INT,
//   email VARCHAR(100),
//   phone VARCHAR(15),
//   enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );
//
// CREATE TABLE student_course (
//   enrollment_id INT PRIMARY KEY AUTO_INCREMENT,
//   student_id INT,
//   course_id INT,
//   FOREIGN KEY (student_id) REFERENCES student(student_id),
//   FOREIGN KEY (course_id) REFERENCES course(course_id),
//   UNIQUE KEY unique_enrollment (student_id, course_id)
// );
//
// CREATE TABLE result (
//   result_id INT PRIMARY KEY AUTO_INCREMENT,
//   student_id INT,
//   course_id INT,
//   marks_obtained DECIMAL(5,2),
//   total_marks DECIMAL(5,2),
//   FOREIGN KEY (student_id) REFERENCES student(student_id),
//   FOREIGN KEY (course_id) REFERENCES course(course_id)
// );
// =================================

// Test route
app.get("/", (req, res) => {
  res.send("College ERP Backend Running");
});

// Start server
app.listen(3001, () => {
  console.log("🚀 Server running on port 3001");
});

app.get("/attendance", (req, res) => {
  const query = `
    SELECT a.student_id, s.name AS student,
           c.course_name AS course,
           a.date, a.status
    FROM attendance a
    JOIN student s ON a.student_id = s.student_id
    JOIN course c ON a.course_id = c.course_id
  `;

  db.query(query, (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Error fetching attendance");
    } else {
      res.json(result);
    }
  });
});

app.post("/attendance", (req, res) => {
     console.log("Received body:", req.body);
  const { student_id, course_id, date, status } = req.body;

  const query = `
    INSERT INTO attendance (student_id, course_id, date, status)
    VALUES (?, ?, ?, ?)
  `;

  db.query(query, [student_id, course_id, date, status], (err) => {
    if (err) {
      console.log(err);
      res.status(500).send("Error inserting attendance");
    } else {
      res.send("Attendance added successfully");
    }
  });
});

app.get("/students", (req, res) => {
  db.query("SELECT student_id, name, department, year, email, phone, IFNULL(enrollment_date, NULL) as enrollment_date FROM student", (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Error fetching students");
    } else {
      res.json(result);
    }
  });
});

app.post("/students", (req, res) => {
  const { name, department, year, email, phone } = req.body;

  if (!name || !department || !year || !email || !phone) {
    return res.status(400).send("All student fields are required");
  }

  const query = `
    INSERT INTO student (name, department, year, email, phone)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(query, [name, department, year, email, phone], (err, result) => {
    if (err) {
      console.log("add student error", err);
      const msg = err.message || "Error adding student";
      return res.status(500).send(msg);
    }

    res.status(201).json({
      message: "Student added successfully",
      student_id: result.insertId
    });
  });
});

app.put("/students/:id", (req, res) => {
  const { id } = req.params;
  const { name, department, year, email, phone } = req.body;

  if (!name || !department || !year || !email || !phone) {
    return res.status(400).send("All student fields are required");
  }

  const query = `
    UPDATE student
    SET name = ?, department = ?, year = ?, email = ?, phone = ?
    WHERE student_id = ?
  `;

  db.query(query, [name, department, year, email, phone, id], (err, result) => {
    if (err) {
      console.log("update student error", err);
      const msg = err.message || "Error updating student";
      return res.status(500).send(msg);
    }

    if (result.affectedRows === 0) {
      return res.status(404).send("Student not found");
    }

    res.json({ message: "Student updated successfully" });
  });
});

app.delete("/students/:id", (req, res) => {
  const { id } = req.params;

  // some related tables may reference student_id (attendance, results, etc.)
  // delete those first or rely on ON DELETE CASCADE in schema
  // we'll remove attendance and results before deleting student

  db.query("DELETE FROM attendance WHERE student_id = ?", [id], (attErr) => {
    if (attErr) {
      console.log("error deleting attendance for student", attErr);
      return res.status(500).send("Error deleting related attendance records");
    }

    db.query("DELETE FROM result WHERE student_id = ?", [id], (resErr) => {
      if (resErr) {
        console.log("error deleting results for student", resErr);
        // continue; we don't want to block student deletion if result table doesn't exist
      }

      db.query("DELETE FROM student WHERE student_id = ?", [id], (err, result) => {
        if (err) {
          console.log(err);
          // handle foreign key errors explicitly
          if (err.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(400).send("Cannot delete student; dependent records exist.");
          }
          return res.status(500).send("Error deleting student");
        }

        if (result.affectedRows === 0) {
          return res.status(404).send("Student not found");
        }

        res.json({ message: "Student deleted successfully" });
      });
    });
  });
});


app.get("/attendance-report", (req, res) => {
  db.query("SELECT * FROM attendance_report", (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Error fetching report");
    } else {
      res.json(result);
    }
  });
});

// ===== COURSES ENDPOINTS =====
app.get("/courses", (req, res) => {
  db.query("SELECT * FROM course", (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Error fetching courses");
    } else {
      res.json(result);
    }
  });
});

app.post("/courses", (req, res) => {
  const { course_name, department } = req.body;

  if (!course_name || !department) {
    return res.status(400).send("Course name and department are required");
  }

  const query = `
    INSERT INTO course (course_name, department)
    VALUES (?, ?)
  `;

  db.query(query, [course_name, department], (err, result) => {
    if (err) {
      console.log("add course error", err);
      const msg = err.message || "Error adding course";
      return res.status(500).send(msg);
    }

    res.status(201).json({
      message: "Course added successfully",
      course_id: result.insertId
    });
  });
});

app.put("/courses/:id", (req, res) => {
  const { id } = req.params;
  const { course_name, department } = req.body;

  if (!course_name || !department) {
    return res.status(400).send("Course name and department are required");
  }

  const query = `
    UPDATE course
    SET course_name = ?, department = ?
    WHERE course_id = ?
  `;

  db.query(query, [course_name, department, id], (err, result) => {
    if (err) {
      console.log("update course error", err);
      const msg = err.message || "Error updating course";
      return res.status(500).send(msg);
    }

    if (result.affectedRows === 0) {
      return res.status(404).send("Course not found");
    }

    res.json({ message: "Course updated successfully" });
  });
});

app.delete("/courses/:id", (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM course WHERE course_id = ?", [id], (err, result) => {
    if (err) {
      console.log(err);
      if (err.code === "ER_ROW_IS_REFERENCED_2") {
        return res.status(400).send("Cannot delete course; dependent records exist.");
      }
      return res.status(500).send("Error deleting course");
    }

    if (result.affectedRows === 0) {
      return res.status(404).send("Course not found");
    }

    res.json({ message: "Course deleted successfully" });
  });
});

// ===== STATISTICS ENDPOINTS =====
app.get("/stats", (req, res) => {
  const statsQuery = `
    SELECT 
      (SELECT COUNT(*) FROM student) as total_students,
      (SELECT COUNT(*) FROM course) as total_courses,
      (SELECT COUNT(DISTINCT course_id) FROM attendance) as total_faculty,
      (SELECT COUNT(*) FROM result) as total_exams
  `;

  db.query(statsQuery, (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Error fetching statistics");
    } else {
      res.json(result[0]);
    }
  });
});

// ===== RESULTS ENDPOINTS =====
app.get("/results", (req, res) => {
  getResultSchema((schemaErr, schema) => {
    if (schemaErr) {
      console.log("result schema error", schemaErr);
      return res.status(500).send("Error reading result schema");
    }

    if (!schema.idColumn || !schema.marksColumn || !schema.totalColumn) {
      return res.status(500).send("Result table schema is not supported");
    }

    const query = `
      SELECT
        r.${schema.idColumn} AS result_id,
        r.student_id,
        r.course_id,
        r.${schema.marksColumn} AS marks_obtained,
        r.${schema.totalColumn} AS total_marks,
        s.name AS student_name,
        c.course_name AS course_name
      FROM result r
      JOIN student s ON r.student_id = s.student_id
      JOIN course c ON r.course_id = c.course_id
    `;

    db.query(query, (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send("Error fetching results");
      }

      res.json(result);
    });
  });
});

app.post("/results", (req, res) => {
  const { student_id, course_id, marks_obtained, total_marks } = req.body;

  if (!student_id || !course_id || marks_obtained === undefined || marks_obtained === null || !total_marks) {
    return res.status(400).send("All result fields are required");
  }

  getResultSchema((schemaErr, schema) => {
    if (schemaErr) {
      console.log("result schema error", schemaErr);
      return res.status(500).send("Error reading result schema");
    }

    if (!schema.marksColumn || !schema.totalColumn) {
      return res.status(500).send("Result table schema is not supported");
    }

    const query = `
      INSERT INTO result (student_id, course_id, ${schema.marksColumn}, ${schema.totalColumn})
      VALUES (?, ?, ?, ?)
    `;

    db.query(query, [student_id, course_id, marks_obtained, total_marks], (err, result) => {
      if (err) {
        console.log("add result error", err);
        const msg = err.message || "Error adding result";
        return res.status(500).send(msg);
      }

      res.status(201).json({
        message: "Result added successfully",
        result_id: result.insertId
      });
    });
  });
});

app.put("/results/:id", (req, res) => {
  const { id } = req.params;
  const { student_id, course_id, marks_obtained, total_marks } = req.body;

  if (!student_id || !course_id || marks_obtained === undefined || marks_obtained === null || !total_marks) {
    return res.status(400).send("All result fields are required");
  }

  getResultSchema((schemaErr, schema) => {
    if (schemaErr) {
      console.log("result schema error", schemaErr);
      return res.status(500).send("Error reading result schema");
    }

    if (!schema.idColumn || !schema.marksColumn || !schema.totalColumn) {
      return res.status(500).send("Result table schema is not supported");
    }

    const query = `
      UPDATE result
      SET student_id = ?, course_id = ?, ${schema.marksColumn} = ?, ${schema.totalColumn} = ?
      WHERE ${schema.idColumn} = ?
    `;

    db.query(query, [student_id, course_id, marks_obtained, total_marks, id], (err, result) => {
      if (err) {
        console.log("update result error", err);
        const msg = err.message || "Error updating result";
        return res.status(500).send(msg);
      }

      if (result.affectedRows === 0) {
        return res.status(404).send("Result not found");
      }

      res.json({ message: "Result updated successfully" });
    });
  });
});

app.delete("/results/:id", (req, res) => {
  const { id } = req.params;

  getResultSchema((schemaErr, schema) => {
    if (schemaErr) {
      console.log("result schema error", schemaErr);
      return res.status(500).send("Error reading result schema");
    }

    if (!schema.idColumn) {
      return res.status(500).send("Result table schema is not supported");
    }

    const query = `
      DELETE FROM result
      WHERE ${schema.idColumn} = ?
    `;

    db.query(query, [id], (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send("Error deleting result");
      }

      if (result.affectedRows === 0) {
        return res.status(404).send("Result not found");
      }

      res.json({ message: "Result deleted successfully" });
    });
  });
});

// ===== STUDENT COURSE ENROLLMENT ENDPOINTS =====
app.get("/students/:id/courses", (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT c.* FROM course c
    INNER JOIN student_course sc ON c.course_id = sc.course_id
    WHERE sc.student_id = ?
  `;

  db.query(query, [id], (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Error fetching student courses");
    } else {
      res.json(result);
    }
  });
});

app.post("/students/:id/courses", (req, res) => {
  const { id } = req.params;
  const { course_id } = req.body;

  if (!course_id) {
    return res.status(400).send("Course ID is required");
  }

  const query = `
    INSERT INTO student_course (student_id, course_id)
    VALUES (?, ?)
  `;

  db.query(query, [id, course_id], (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).send("Student is already enrolled in this course");
      }
      console.log("enroll course error", err);
      const msg = err.message || "Error enrolling in course";
      return res.status(500).send(msg);
    }

    res.status(201).json({
      message: "Student enrolled successfully",
      enrollment_id: result.insertId
    });
  });
});

app.delete("/students/:id/courses/:course_id", (req, res) => {
  const { id, course_id } = req.params;

  const query = `
    DELETE FROM student_course
    WHERE student_id = ? AND course_id = ?
  `;

  db.query(query, [id, course_id], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Error removing course enrollment");
    }

    if (result.affectedRows === 0) {
      return res.status(404).send("Enrollment record not found");
    }

    res.json({ message: "Course enrollment removed successfully" });
  });
});
