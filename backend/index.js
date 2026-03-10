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
  db.query("SELECT * FROM student", (err, result) => {
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
      console.log(err);
      return res.status(500).send("Error adding student");
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
      console.log(err);
      return res.status(500).send("Error updating student");
    }

    if (result.affectedRows === 0) {
      return res.status(404).send("Student not found");
    }

    res.json({ message: "Student updated successfully" });
  });
});

app.delete("/students/:id", (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM student WHERE student_id = ?", [id], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Error deleting student");
    }

    if (result.affectedRows === 0) {
      return res.status(404).send("Student not found");
    }

    res.json({ message: "Student deleted successfully" });
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
