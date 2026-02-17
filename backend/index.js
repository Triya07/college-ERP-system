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
  password: "1972001Prachi@", // change ONLY if your password is different
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
