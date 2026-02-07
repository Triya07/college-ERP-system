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
