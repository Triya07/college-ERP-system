console.log("🔥 index.js started");

require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const app = express();
const getRequiredEnv = (name) => {
  const value = process.env[name];
  if (value === undefined || value === null || String(value).trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return String(value).trim();
};

const JWT_SECRET = getRequiredEnv("JWT_SECRET");
const DB_HOST = process.env.DB_HOST ? String(process.env.DB_HOST).trim() : "localhost";
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_USER = process.env.DB_USER ? String(process.env.DB_USER).trim() : "root";
const DB_PASSWORD = getRequiredEnv("DB_PASSWORD");
const DB_NAME = process.env.DB_NAME ? String(process.env.DB_NAME).trim() : "college_erp";
const PORT = Number(getRequiredEnv("PORT"));
const CORS_ORIGIN = process.env.CORS_ORIGIN ? String(process.env.CORS_ORIGIN).trim() : "*";

if (!Number.isFinite(DB_PORT) || DB_PORT <= 0) {
  throw new Error("Invalid DB_PORT value");
}
if (!Number.isFinite(PORT) || PORT <= 0) {
  throw new Error("Invalid PORT value");
}

app.use(cors({ origin: CORS_ORIGIN === "*" ? "*" : CORS_ORIGIN.split(",").map((item) => item.trim()).filter(Boolean) }));
app.use(express.json());

const DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL || "admin@college.com";
const PROTECTED_ADMIN_EMAILS = new Set([DEFAULT_ADMIN_EMAIL.toLowerCase()]);

const queryAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) {
        return reject(err);
      }
      resolve(rows);
    });
  });

const ATTENDANCE_WARNING_THRESHOLD = 75;
const YEAR_SEMESTER_RULES = {
  1: ["1", "2"],
  2: ["3", "4"],
  3: ["5", "6"],
  4: ["7", "8"]
};

const normalizeYearValue = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 4) {
    return null;
  }
  return parsed;
};

const normalizeSemesterValue = (value) => {
  const normalized = String(value || "").trim();
  if (!/^[1-8]$/.test(normalized)) {
    return null;
  }
  return normalized;
};

const validateYearSemesterPair = (year, semester) => {
  const normalizedYear = normalizeYearValue(year);
  const normalizedSemester = normalizeSemesterValue(semester);

  if (!normalizedYear || !normalizedSemester) {
    return {
      valid: false,
      message: "Year must be 1-4 and semester must be 1-8"
    };
  }

  const allowedSemesters = YEAR_SEMESTER_RULES[normalizedYear] || [];
  if (!allowedSemesters.includes(normalizedSemester)) {
    return {
      valid: false,
      message: `Invalid semester for Year ${normalizedYear}. Allowed semesters: ${allowedSemesters.join(" or ")}`
    };
  }

  return {
    valid: true,
    year: normalizedYear,
    semester: normalizedSemester
  };
};

const calculateClassesNeededForThreshold = (presentCount, totalCount, threshold = ATTENDANCE_WARNING_THRESHOLD) => {
  const present = Number(presentCount) || 0;
  const total = Number(totalCount) || 0;
  const ratio = Number(threshold) / 100;

  if (total <= 0 || present / total >= ratio) {
    return 0;
  }

  return Math.max(0, Math.ceil((ratio * total - present) / (1 - ratio)));
};

const buildAttendanceAlertTitle = (courseName, courseId) =>
  `Attendance Alert - ${courseName} (#${courseId})`;

const getStudentCourseAttendanceStats = async (studentId) => {
  const normalizedStudentId = Number(studentId);
  if (!normalizedStudentId) return [];

  return queryAsync(
    `
      SELECT
        agg.course_id,
        c.course_name,
        SUM(CASE WHEN agg.status = 'present' THEN 1 ELSE 0 END) AS present_count,
        COUNT(*) AS total_count
      FROM (
        SELECT course_id, LOWER(status) AS status
        FROM attendance
        WHERE student_id = ?

        UNION ALL

        SELECT cg.course_id AS course_id, LOWER(ca.status) AS status
        FROM class_attendance ca
        JOIN class_group cg ON cg.class_id = ca.class_id
        WHERE ca.student_id = ?
      ) agg
      JOIN course c ON c.course_id = agg.course_id
      GROUP BY agg.course_id, c.course_name
    `,
    [normalizedStudentId, normalizedStudentId]
  );
};

const syncNotificationGroupByPrefix = async ({ userId, prefix, items, actorUserId = null }) => {
  if (!userId || !prefix) return;

  const existingRows = await queryAsync(
    "SELECT notification_id, title, message, category, is_read FROM notification WHERE user_id = ? AND title LIKE ?",
    [userId, `${prefix}%`]
  );

  const existingByTitle = new Map(existingRows.map((row) => [String(row.title), row]));
  const activeTitles = new Set();

  for (const item of items) {
    const title = String(item.title || "").trim();
    const message = String(item.message || "").trim();
    if (!title || !message) continue;

    activeTitles.add(title);
    const existing = existingByTitle.get(title);
    const normalizedCategory = item.category || "General";

    if (existing) {
      const changed = String(existing.message || "") !== message || String(existing.category || "") !== String(normalizedCategory);
      if (changed) {
        await queryAsync(
          "UPDATE notification SET message = ?, category = ?, is_read = FALSE WHERE notification_id = ?",
          [message, normalizedCategory, existing.notification_id]
        );
      }
    } else {
      await queryAsync(
        "INSERT INTO notification (user_id, title, message, category, created_by) VALUES (?, ?, ?, ?, ?)",
        [userId, title, message, normalizedCategory, actorUserId || null]
      );
    }
  }

  for (const row of existingRows) {
    if (!activeTitles.has(String(row.title))) {
      await queryAsync("UPDATE notification SET is_read = TRUE WHERE notification_id = ?", [row.notification_id]);
    }
  }
};

const buildAttendanceMilestoneItems = (studentName, attendanceStats) => {
  const items = [];

  for (const row of attendanceStats) {
    const presentCount = Number(row.present_count || 0);
    const totalCount = Number(row.total_count || 0);
    if (!totalCount) continue;

    const percentage = (presentCount * 100) / totalCount;
    if (percentage >= 90) continue;

    const courseName = String(row.course_name || "Course");
    const courseId = Number(row.course_id || 0);
    let bandText = "below 90%";
    let category = "Academic";

    if (percentage < 70) {
      bandText = "below 70%";
      category = "Urgent";
    } else if (percentage < 75) {
      bandText = "below 75%";
      category = "Urgent";
    } else if (percentage < 80) {
      bandText = "below 80%";
      category = "Academic";
    }

    items.push({
      title: `AUTO: Attendance Milestone - ${courseName} (#${courseId})`,
      message: `${studentName}, your attendance in ${courseName} is ${percentage.toFixed(2)}% (${bandText}).`,
      category
    });
  }

  return items;
};

const buildFeeAlertItems = async (studentId) => {
  const rows = await queryAsync(
    `
      SELECT fee_id, fee_type, semester, amount_due, amount_paid, due_date, status, updated_at,
             DATEDIFF(DATE(due_date), CURDATE()) AS days_left
      FROM fee_record
      WHERE student_id = ?
    `,
    [studentId]
  );

  const items = [];
  for (const row of rows) {
    const amountDue = Number(row.amount_due || 0).toFixed(2);
    const amountPaid = Number(row.amount_paid || 0).toFixed(2);
    const daysLeft = Number(row.days_left);
    const status = String(row.status || "Pending");
    const label = `${row.fee_type || "Fee"} (${row.semester || "Semester"})`;

    if (row.due_date && status !== "Paid" && [7, 3, 1].includes(daysLeft)) {
      items.push({
        title: `AUTO: Fee Due - ${label} (#${row.fee_id}) [${daysLeft}d]`,
        message: `${label} payment of ${amountDue} is due in ${daysLeft} day(s). Paid: ${amountPaid}.`,
        category: daysLeft <= 1 ? "Urgent" : "Fees"
      });
    }

    if (row.due_date && status !== "Paid" && daysLeft < 0) {
      items.push({
        title: `AUTO: Fee Overdue - ${label} (#${row.fee_id})`,
        message: `${label} is overdue. Due amount: ${amountDue}, paid: ${amountPaid}.`,
        category: "Urgent"
      });
    }

    if (status === "Paid") {
      items.push({
        title: `AUTO: Fee Payment Received - ${label} (#${row.fee_id})`,
        message: `Payment received for ${label}. Amount paid: ${amountPaid}.`,
        category: "Fees"
      });
    }
  }

  return items;
};

const buildTimetableUpdateItems = async (studentId) => {
  const rows = await queryAsync(
    `
      SELECT t.timetable_id, t.day_of_week, t.start_time, t.end_time, t.room_number, c.course_name
      FROM timetable_entry t
      JOIN student_course sc ON sc.course_id = t.course_id
      JOIN course c ON c.course_id = t.course_id
      WHERE sc.student_id = ?
        AND DATE(t.created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      ORDER BY t.created_at DESC
    `,
    [studentId]
  );

  return rows.map((row) => ({
    title: `AUTO: Timetable Update - ${row.course_name} (#${row.timetable_id})`,
    message: `Timetable updated: ${row.course_name} on ${row.day_of_week}, ${row.start_time} - ${row.end_time}${row.room_number ? `, Room ${row.room_number}` : ""}.`,
    category: "Academic"
  }));
};

const buildResultAndGpaItems = async (studentId) => {
  try {
    const schema = await getResultSchemaAsync();
    if (!schema.idColumn || !schema.marksColumn || !schema.totalColumn) return [];

    const rows = await queryAsync(
      `
        SELECT
          r.${schema.idColumn} AS result_id,
          r.${schema.marksColumn} AS marks_obtained,
          r.${schema.totalColumn} AS total_marks,
          c.course_name
        FROM result r
        JOIN course c ON c.course_id = r.course_id
        WHERE r.student_id = ?
        ORDER BY r.${schema.idColumn} DESC
      `,
      [studentId]
    );

    if (!rows.length) return [];

    const toPercentage = (row) => {
      const marks = Number(row.marks_obtained || 0);
      const total = Number(row.total_marks || 0);
      if (!total) return 0;
      return (marks * 100) / total;
    };

    const latest = rows[0];
    const latestPct = toPercentage(latest);
    const currentAvg = rows.reduce((acc, row) => acc + toPercentage(row), 0) / rows.length;

    const items = [
      {
        title: `AUTO: Result Update - ${latest.course_name} (#${latest.result_id})`,
        message: `New/updated result in ${latest.course_name}: ${latestPct.toFixed(2)}%.`,
        category: "Exam"
      }
    ];

    if (rows.length > 1) {
      const previousAvg = rows.slice(1).reduce((acc, row) => acc + toPercentage(row), 0) / (rows.length - 1);
      const delta = currentAvg - previousAvg;
      if (Math.abs(delta) >= 0.1) {
        const direction = delta >= 0 ? "improved" : "dropped";
        items.push({
          title: "AUTO: GPA Change Alert",
          message: `Overall performance has ${direction} by ${Math.abs(delta).toFixed(2)} points. Current average: ${currentAvg.toFixed(2)}%.`,
          category: delta >= 0 ? "Academic" : "Urgent"
        });
      }
    }

    return items;
  } catch (err) {
    console.log("result notification sync warning:", err.message);
    return [];
  }
};

const syncStudentAutomatedNotifications = async (studentId, actorUserId = null) => {
  try {
    const studentRows = await queryAsync(
      "SELECT student_id, user_id, name FROM student WHERE student_id = ? LIMIT 1",
      [Number(studentId)]
    );
    if (!studentRows.length) return;

    const studentName = String(studentRows[0].name || "Student");
    const studentUserId = Number(studentRows[0].user_id || 0);
    const normalizedStudentId = Number(studentRows[0].student_id || 0);
    if (!studentUserId || !normalizedStudentId) return;

    await syncAttendanceRiskNotificationsForStudent(normalizedStudentId, actorUserId);

    const attendanceStats = await getStudentCourseAttendanceStats(normalizedStudentId);
    const milestoneItems = buildAttendanceMilestoneItems(studentName, attendanceStats);
    await syncNotificationGroupByPrefix({
      userId: studentUserId,
      prefix: "AUTO: Attendance Milestone -",
      items: milestoneItems,
      actorUserId
    });

    const feeItems = await buildFeeAlertItems(normalizedStudentId);
    await syncNotificationGroupByPrefix({
      userId: studentUserId,
      prefix: "AUTO: Fee ",
      items: feeItems,
      actorUserId
    });

    const timetableItems = await buildTimetableUpdateItems(normalizedStudentId);
    await syncNotificationGroupByPrefix({
      userId: studentUserId,
      prefix: "AUTO: Timetable Update -",
      items: timetableItems,
      actorUserId
    });

    const resultItems = await buildResultAndGpaItems(normalizedStudentId);
    await syncNotificationGroupByPrefix({
      userId: studentUserId,
      prefix: "AUTO: Result Update -",
      items: resultItems.filter((item) => item.title.startsWith("AUTO: Result Update -")),
      actorUserId
    });
    await syncNotificationGroupByPrefix({
      userId: studentUserId,
      prefix: "AUTO: GPA Change Alert",
      items: resultItems.filter((item) => item.title === "AUTO: GPA Change Alert"),
      actorUserId
    });
  } catch (err) {
    console.log("student notification sync warning:", err.message);
  }
};

const syncAttendanceRiskNotificationsForStudent = async (studentId, actorUserId = null) => {
  try {
    const normalizedStudentId = Number(studentId);
    if (!normalizedStudentId) return;

    const studentRows = await queryAsync(
      "SELECT student_id, user_id, name FROM student WHERE student_id = ? LIMIT 1",
      [normalizedStudentId]
    );

    if (!studentRows.length) return;

    const studentUserId = Number(studentRows[0].user_id || 0);
    const studentName = String(studentRows[0].name || "Student").trim();
    if (!studentUserId) return;

    const courseStats = await getStudentCourseAttendanceStats(normalizedStudentId);

    for (const row of courseStats) {
      const courseId = Number(row.course_id);
      const courseName = String(row.course_name || "Course").trim();
      const presentCount = Number(row.present_count || 0);
      const totalCount = Number(row.total_count || 0);
      const percentage = totalCount ? (presentCount * 100) / totalCount : 0;
      const title = buildAttendanceAlertTitle(courseName, courseId);

      if (percentage < ATTENDANCE_WARNING_THRESHOLD) {
        const classesNeeded = calculateClassesNeededForThreshold(presentCount, totalCount, ATTENDANCE_WARNING_THRESHOLD);
        const message =
          classesNeeded <= 1
            ? `${studentName}, your attendance in ${courseName} is ${percentage.toFixed(2)}%. Attend the next class to recover above ${ATTENDANCE_WARNING_THRESHOLD}%.`
            : `${studentName}, your attendance in ${courseName} is ${percentage.toFixed(2)}%. Attend the next ${classesNeeded} classes to recover above ${ATTENDANCE_WARNING_THRESHOLD}%.`;

        const existing = await queryAsync(
          `
            SELECT notification_id, message, category, is_read
            FROM notification
            WHERE user_id = ? AND title = ?
            ORDER BY created_at DESC
            LIMIT 1
          `,
          [studentUserId, title]
        );

        if (existing.length) {
          const existingRow = existing[0];
          const changed = String(existingRow.message || "") !== message || String(existingRow.category || "") !== "Urgent";
          await queryAsync(
            `
              UPDATE notification
              SET message = ?, category = 'Urgent', is_read = CASE WHEN ? THEN FALSE ELSE is_read END
              WHERE notification_id = ?
            `,
            [message, changed ? 1 : 0, existingRow.notification_id]
          );
        } else {
          await queryAsync(
            `
              INSERT INTO notification (user_id, title, message, category, created_by)
              VALUES (?, ?, ?, 'Urgent', ?)
            `,
            [studentUserId, title, message, actorUserId || null]
          );
        }
      } else {
        await queryAsync(
          `
            UPDATE notification
            SET is_read = TRUE
            WHERE user_id = ? AND title = ? AND is_read = FALSE
          `,
          [studentUserId, title]
        );
      }
    }
  } catch (err) {
    console.log("attendance notification sync warning:", err.message);
  }
};

const normalizeList = (value) => {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  return [...new Set(normalized)];
};

const normalizeStatus = (status) => {
  const normalized = String(status || "present").trim().toLowerCase();
  return normalized === "absent" ? "absent" : "present";
};

const emailPrefix = (email) => String(email || "").split("@")[0].trim();

const withSafeJson = (value, fallback) => {
  try {
    return JSON.parse(value || JSON.stringify(fallback));
  } catch (err) {
    return fallback;
  }
};

const beginTransactionAsync = () =>
  new Promise((resolve, reject) => {
    db.beginTransaction((err) => {
      if (err) return reject(err);
      resolve();
    });
  });

const commitTransactionAsync = () =>
  new Promise((resolve, reject) => {
    db.commit((err) => {
      if (err) return reject(err);
      resolve();
    });
  });

const rollbackTransactionAsync = () =>
  new Promise((resolve) => {
    db.rollback(() => resolve());
  });

const runInTransaction = async (work) => {
  await beginTransactionAsync();
  try {
    const result = await work();
    await commitTransactionAsync();
    return result;
  } catch (err) {
    await rollbackTransactionAsync();
    throw err;
  }
};

const createRateLimiter = ({ windowMs, maxRequests }) => {
  const store = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.ip || "unknown"}:${req.path}`;
    const record = store.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + windowMs;
    }

    record.count += 1;
    store.set(key, record);

    if (record.count > maxRequests) {
      const retryAfter = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({ message: "Too many requests. Please try again later." });
    }

    return next();
  };
};

const authRateLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 30 });

const safeSerialize = (value) => {
  try {
    return JSON.stringify(value || {});
  } catch (err) {
    return JSON.stringify({ note: "serialization_failed" });
  }
};

const createAuditLog = async ({ action, actor_user_id, target_type, target_id, details, req }) => {
  try {
    await queryAsync(
      `
        INSERT INTO audit_log (action, actor_user_id, target_type, target_id, details, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        action,
        actor_user_id || null,
        target_type || null,
        target_id !== undefined ? String(target_id) : null,
        safeSerialize(details),
        req?.ip || null,
        req?.headers?.["user-agent"] || null
      ]
    );
  } catch (err) {
    console.log("audit log warning:", err.message);
  }
};

const sendResetToken = async ({ email, token }) => {
  const webhook = process.env.RESET_TOKEN_WEBHOOK_URL;
  if (!webhook) return false;

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: "password_reset",
        email,
        token,
        expires_in_minutes: 15
      })
    });
    return response.ok;
  } catch (err) {
    console.log("reset token delivery warning:", err.message);
    return false;
  }
};

// MySQL connection
const db = mysql.createConnection({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  port: DB_PORT
});

// Check database connection
db.connect((err) => {
  if (err) {
    console.log("❌ MySQL connection failed");
    console.log(err);
    if (err.code === "ER_ACCESS_DENIED_ERROR") {
      console.log("ℹ️  Check DB_USER and DB_PASSWORD in backend/.env (current host: " + DB_HOST + ")");
    }
    process.exit(1);
  } else {
    console.log("✅ Connected to MySQL database");
    ensureFeatureTables();
  }
});

// ===== MIDDLEWARE =====
// Verify JWT Token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }

  db.query(
    "SELECT user_id, email, role, is_active FROM user WHERE user_id = ? LIMIT 1",
    [decoded.user_id],
    (err, rows) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Token verification failed" });
      }

      if (!rows.length) {
        return res.status(401).json({ message: "Invalid token" });
      }

      const user = rows[0];
      if (!user.is_active) {
        return res.status(403).json({ message: "Account is inactive. Contact administrator." });
      }

      req.user = {
        user_id: user.user_id,
        email: user.email,
        role: user.role
      };

      return next();
    }
  );
};

// Check user role
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

const getStudentIdByUserId = (userId, callback) => {
  db.query("SELECT student_id FROM student WHERE user_id = ?", [userId], (err, rows) => {
    if (err) {
      return callback(err);
    }
    if (!rows.length) {
      return callback(new Error("Student profile not found"));
    }
    callback(null, rows[0].student_id);
  });
};

const getFacultyIdByUserId = (userId, callback) => {
  db.query("SELECT faculty_id FROM faculty WHERE user_id = ?", [userId], (err, rows) => {
    if (err) {
      return callback(err);
    }
    if (!rows.length) {
      return callback(new Error("Faculty profile not found"));
    }
    callback(null, rows[0].faculty_id);
  });
};

const isProtectedAdminByUserId = (userId, callback) => {
  db.query(
    "SELECT role, email FROM user WHERE user_id = ?",
    [userId],
    (err, rows) => {
      if (err) return callback(err);
      if (!rows.length) return callback(null, false);
      const row = rows[0];
      const isProtected = row.role === "admin" && PROTECTED_ADMIN_EMAILS.has(String(row.email || "").toLowerCase());
      callback(null, isProtected);
    }
  );
};

const ensureFeatureTables = () => {
  const isIgnorableSetupError = (err) => {
    if (!err) return false;
    return ["ER_DUP_FIELDNAME", "ER_DUP_KEYNAME"].includes(err.code);
  };

  const statements = [
    `
      CREATE TABLE IF NOT EXISTS timetable_entry (
        timetable_id INT PRIMARY KEY AUTO_INCREMENT,
        day_of_week ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        course_id INT NOT NULL,
        faculty_id INT,
        room_number VARCHAR(30),
        session_type ENUM('Lecture','Lab','Tutorial','Seminar') DEFAULT 'Lecture',
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES course(course_id) ON DELETE CASCADE,
        FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES user(user_id) ON DELETE SET NULL
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS fee_record (
        fee_id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        semester VARCHAR(30) NOT NULL,
        fee_type VARCHAR(50) DEFAULT 'Tuition',
        amount_due DECIMAL(10,2) NOT NULL,
        amount_paid DECIMAL(10,2) DEFAULT 0,
        due_date DATE,
        status ENUM('Pending','Partially Paid','Paid','Overdue') DEFAULT 'Pending',
        remarks VARCHAR(255),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS notification (
        notification_id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        title VARCHAR(150) NOT NULL,
        message TEXT NOT NULL,
        category ENUM('General','Academic','Fees','Exam','Urgent') DEFAULT 'General',
        is_read BOOLEAN DEFAULT FALSE,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES user(user_id) ON DELETE SET NULL
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS announcement (
        announcement_id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(150) NOT NULL,
        content TEXT NOT NULL,
        priority ENUM('Low','Normal','High','Critical') DEFAULT 'Normal',
        expires_at DATE,
        is_active BOOLEAN DEFAULT TRUE,
        posted_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (posted_by) REFERENCES user(user_id) ON DELETE SET NULL
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS course_registration_request (
        request_id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        course_id INT NOT NULL,
        status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
        student_note VARCHAR(255),
        reviewer_note VARCHAR(255),
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP NULL,
        reviewed_by INT,
        FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES course(course_id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES user(user_id) ON DELETE SET NULL
      )
    `,
    "ALTER TABLE user ADD COLUMN username VARCHAR(80) NULL UNIQUE",
    "ALTER TABLE user ADD COLUMN academic_id VARCHAR(80) NULL",
    "ALTER TABLE student ADD COLUMN semester VARCHAR(20) NULL",
    "ALTER TABLE student ADD COLUMN section VARCHAR(20) NULL",
    "ALTER TABLE student ADD COLUMN academic_id VARCHAR(80) NULL",
    "ALTER TABLE faculty ADD COLUMN academic_id VARCHAR(80) NULL",
    "ALTER TABLE course ADD COLUMN semester VARCHAR(20) NULL",
    "ALTER TABLE course ADD COLUMN description TEXT NULL",
    "ALTER TABLE result ADD COLUMN exam_type ENUM('midsem','endsem','semester') DEFAULT 'semester'",
    "ALTER TABLE announcement ADD COLUMN target_roles VARCHAR(120) NULL",
    "ALTER TABLE announcement ADD COLUMN target_course_id INT NULL",
    "ALTER TABLE announcement ADD COLUMN target_class_id INT NULL",
    "ALTER TABLE announcement ADD COLUMN target_semester VARCHAR(20) NULL",
    "ALTER TABLE announcement ADD COLUMN target_section VARCHAR(20) NULL",
    `
      CREATE TABLE IF NOT EXISTS class_group (
        class_id INT PRIMARY KEY AUTO_INCREMENT,
        class_name VARCHAR(120) NOT NULL,
        course_id INT NOT NULL,
        professor_id INT,
        semester VARCHAR(20),
        section VARCHAR(20),
        term_start_date DATE,
        term_end_date DATE,
        weekdays VARCHAR(100),
        start_time TIME,
        end_time TIME,
        room VARCHAR(50),
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES course(course_id) ON DELETE CASCADE,
        FOREIGN KEY (professor_id) REFERENCES faculty(faculty_id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES user(user_id) ON DELETE SET NULL
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS class_student (
        id INT PRIMARY KEY AUTO_INCREMENT,
        class_id INT NOT NULL,
        student_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_class_student (class_id, student_id),
        FOREIGN KEY (class_id) REFERENCES class_group(class_id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS class_attendance (
        class_attendance_id INT PRIMARY KEY AUTO_INCREMENT,
        class_id INT NOT NULL,
        student_id INT NOT NULL,
        session_date DATE NOT NULL,
        status ENUM('present', 'absent') NOT NULL DEFAULT 'present',
        marked_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_class_attendance (class_id, student_id, session_date),
        FOREIGN KEY (class_id) REFERENCES class_group(class_id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE,
        FOREIGN KEY (marked_by) REFERENCES user(user_id) ON DELETE SET NULL
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS academic_config (
        config_id INT PRIMARY KEY,
        departments TEXT,
        semesters TEXT,
        sections TEXT,
        updated_by INT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (updated_by) REFERENCES user(user_id) ON DELETE SET NULL
      )
    `,
    `
      INSERT IGNORE INTO academic_config (config_id, departments, semesters, sections)
      VALUES (1, '["CSE","IT","ECE","ME"]', '["1","2","3","4","5","6","7","8"]', '["A","B","C"]')
    `,
    `
      CREATE TABLE IF NOT EXISTS academic_event (
        event_id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(150) NOT NULL,
        event_type ENUM('holiday','exam','no_class') NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        department VARCHAR(50),
        semester VARCHAR(20),
        section VARCHAR(20),
        notes VARCHAR(255),
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES user(user_id) ON DELETE SET NULL
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS password_reset_token (
        token_id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        used_at DATETIME NULL,
        requested_ip VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS audit_log (
        audit_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        action VARCHAR(120) NOT NULL,
        actor_user_id INT NULL,
        target_type VARCHAR(80),
        target_id VARCHAR(80),
        details JSON,
        ip_address VARCHAR(45),
        user_agent VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (actor_user_id) REFERENCES user(user_id) ON DELETE SET NULL
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS guardian_profile (
        guardian_id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        guardian_name VARCHAR(120) NOT NULL,
        relation VARCHAR(50) DEFAULT 'Parent',
        phone VARCHAR(20),
        email VARCHAR(120),
        address VARCHAR(255),
        is_primary BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE
      )
    `,




    `
      CREATE TABLE IF NOT EXISTS campus_service_request (
        request_id INT PRIMARY KEY AUTO_INCREMENT,
        service_type ENUM('library', 'hostel', 'transport') NOT NULL,
        requester_user_id INT NOT NULL,
        title VARCHAR(150) NOT NULL,
        description TEXT,
        status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP NULL,
        reviewed_by INT,
        review_note VARCHAR(255),
        FOREIGN KEY (requester_user_id) REFERENCES user(user_id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES user(user_id) ON DELETE SET NULL
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS leave_request (
        leave_id INT PRIMARY KEY AUTO_INCREMENT,
        requester_user_id INT NOT NULL,
        leave_type VARCHAR(50) NOT NULL,
        from_date DATE NOT NULL,
        to_date DATE NOT NULL,
        reason VARCHAR(255),
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP NULL,
        reviewed_by INT,
        review_note VARCHAR(255),
        FOREIGN KEY (requester_user_id) REFERENCES user(user_id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES user(user_id) ON DELETE SET NULL
      )
    `,
  ];

  const runNext = (index = 0) => {
    if (index >= statements.length) {
      console.log("✅ Extended feature tables are ready");
      return;
    }

    db.query(statements[index], (err) => {
      if (err && !isIgnorableSetupError(err)) {
        console.log("Feature setup warning:", err.message);
      }
      runNext(index + 1);
    });
  };

  runNext();
};

// ===== AUTHENTICATION ROUTES =====
app.post("/auth/signup", authRateLimiter, async (req, res) => {
  const { email, password, role, name, department, year, semester, section, phone, username, academic_id } = req.body;
  const normalizedRole = String(role || "").trim().toLowerCase();

  if (!email || !password || !normalizedRole || !name) {
    return res.status(400).json({ message: "All fields required" });
  }

  if (!["student", "teacher"].includes(normalizedRole)) {
    return res.status(400).json({ message: "Only student and teacher registration is allowed" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const computedUsername = String(username || emailPrefix(email)).trim();
    const computedAcademicId = String(academic_id || computedUsername).trim();

    const outcome = await runInTransaction(async () => {
      const userResult = await queryAsync(
        "INSERT INTO user (email, password, role, username, academic_id) VALUES (?, ?, ?, ?, ?)",
        [email, hashedPassword, normalizedRole, computedUsername, computedAcademicId]
      );

      const userId = userResult.insertId;
      if (normalizedRole === "student") {
        const validation = validateYearSemesterPair(year, semester);
        if (!validation.valid) {
          throw Object.assign(new Error(validation.message), { statusCode: 400 });
        }

        const rollNumber = `STU${userId}${Date.now()}`.substring(0, 20);
        await queryAsync(
          "INSERT INTO student (user_id, name, department, year, semester, section, phone, roll_number, academic_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            userId,
            name,
            department || "General",
            validation.year,
            validation.semester,
            section || "A",
            phone || "",
            rollNumber,
            computedAcademicId
          ]
        );
        return { message: "Student registered successfully", userId };
      }

      await queryAsync(
        "INSERT INTO faculty (user_id, name, department, phone, academic_id) VALUES (?, ?, ?, ?, ?)",
        [userId, name, department || "General", phone || "", computedAcademicId]
      );
      return { message: "Teacher registered successfully", userId };
    });

    await createAuditLog({
      action: "auth.signup",
      actor_user_id: outcome.userId,
      target_type: normalizedRole,
      target_id: outcome.userId,
      details: { role: normalizedRole, email },
      req
    });

    return res.status(201).json({ message: outcome.message });
  } catch (err) {
    console.log(err);
    if (err.statusCode === 400) {
      return res.status(400).json({ message: err.message || "Invalid signup payload" });
    }
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Email/username already exists" });
    }
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/auth/login", authRateLimiter, async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  try {
    db.query(
      "SELECT user_id, email, password, role, username, academic_id, is_active FROM user WHERE email = ?",
      [email],
      async (err, results) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ message: "Server error" });
        }

        if (!results.length) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        const user = results[0];
        const passwordValid = await bcrypt.compare(password, user.password);
        if (!passwordValid) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        if (!user.is_active) {
          return res.status(403).json({ message: "Account is inactive. Contact administrator." });
        }

        if (role && String(role).trim().toLowerCase() !== String(user.role || "").toLowerCase()) {
          return res.status(403).json({ message: "Role mismatch: please login with the correct role" });
        }

        const token = jwt.sign(
          { user_id: user.user_id, email: user.email, role: user.role },
          JWT_SECRET,
          { expiresIn: "24h" }
        );

        const respondWithProfile = (query, params) => {
          db.query(query, params, (profileErr, profileRows) => {
            if (profileErr) {
              console.log(profileErr);
              return res.status(500).json({ message: "Server error" });
            }

            return res.json({
              token,
              user: { ...user, password: undefined },
              profile: profileRows?.[0] || {}
            });
          });
        };

        if (user.role === "student") {
          return respondWithProfile(
            "SELECT student_id, name, department, year, semester, section, academic_id FROM student WHERE user_id = ?",
            [user.user_id]
          );
        }

        if (user.role === "teacher") {
          return respondWithProfile(
            "SELECT faculty_id, name, department, academic_id FROM faculty WHERE user_id = ?",
            [user.user_id]
          );
        }

        return respondWithProfile(
          "SELECT admin_id, name, department FROM admin WHERE user_id = ?",
          [user.user_id]
        );
      }
    );
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/auth/forgot-password", authRateLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const genericMessage = "If your email exists in our system, a reset link/token has been sent";

  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const users = await queryAsync(
      "SELECT user_id, email, role FROM user WHERE LOWER(email) = ? LIMIT 1",
      [normalizedEmail]
    );

    if (!users.length) {
      return res.json({ message: genericMessage });
    }

    const user = users[0];
    if (user.role === "admin" && PROTECTED_ADMIN_EMAILS.has(normalizedEmail)) {
      return res.status(403).json({ message: "Default admin password cannot be reset from this endpoint" });
    }

    await queryAsync("DELETE FROM password_reset_token WHERE user_id = ? AND used_at IS NULL", [user.user_id]);

    const resetToken = crypto.randomBytes(24).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

    await queryAsync(
      `
        INSERT INTO password_reset_token (user_id, token_hash, expires_at, requested_ip)
        VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), ?)
      `,
      [user.user_id, tokenHash, req.ip || null]
    );

    const isProd = String(process.env.NODE_ENV || "").toLowerCase() === "production";
    if (isProd) {
      const sent = await sendResetToken({ email: user.email, token: resetToken });
      if (!sent) {
        await queryAsync("DELETE FROM password_reset_token WHERE user_id = ? AND used_at IS NULL", [user.user_id]);
        return res.status(500).json({ message: "Password reset delivery is not configured" });
      }
      return res.json({ message: genericMessage });
    }

    return res.json({
      message: `${genericMessage} (Development mode: use the reset token from this response.)`,
      reset_token: resetToken
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Could not process password reset request" });
  }
});

app.post("/auth/reset-password", authRateLimiter, async (req, res) => {
  const { email, token, newPassword } = req.body;

  if (!email || !token || !newPassword) {
    return res.status(400).json({ message: "Email, token, and new password are required" });
  }

  if (String(newPassword).length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const users = await queryAsync(
      "SELECT user_id, email, role FROM user WHERE LOWER(email) = ? LIMIT 1",
      [normalizedEmail]
    );

    if (!users.length) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const user = users[0];
    if (user.role === "admin" && PROTECTED_ADMIN_EMAILS.has(normalizedEmail)) {
      return res.status(403).json({ message: "Default admin password cannot be reset from this endpoint" });
    }

    const tokenHash = crypto.createHash("sha256").update(String(token)).digest("hex");
    const tokenRows = await queryAsync(
      `
        SELECT token_id
        FROM password_reset_token
        WHERE user_id = ?
          AND token_hash = ?
          AND used_at IS NULL
          AND expires_at > NOW()
        LIMIT 1
      `,
      [user.user_id, tokenHash]
    );

    if (!tokenRows.length) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await queryAsync("UPDATE user SET password = ? WHERE user_id = ?", [hashedPassword, user.user_id]);
    await queryAsync("UPDATE password_reset_token SET used_at = NOW() WHERE token_id = ?", [tokenRows[0].token_id]);
    await queryAsync("DELETE FROM password_reset_token WHERE user_id = ? AND used_at IS NULL", [user.user_id]);

    return res.json({ message: "Password reset successful. Please login with your new password." });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Could not reset password" });
  }
});

// Verify Token & Get User Info
app.get("/auth/verify", verifyToken, (req, res) => {
  let query = "";

  if (req.user.role === "student") {
    query = "SELECT student_id, name, department, year, semester, section, academic_id FROM student WHERE user_id = ?";
  } else if (req.user.role === "teacher") {
    query = "SELECT faculty_id, name, department, academic_id FROM faculty WHERE user_id = ?";
  } else {
    query = "SELECT admin_id, name, department FROM admin WHERE user_id = ?";
  }

  db.query(query, [req.user.user_id], (err, rows) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: "Could not verify user profile" });
    }

    const profile = rows?.[0] || {};
    res.json({
      user: req.user,
      profile
    });
  });
});

app.post("/auth/change-password", verifyToken, authRateLimiter, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Current and new password are required" });
  }

  if (String(newPassword).length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  isProtectedAdminByUserId(req.user.user_id, async (protectErr, isProtected) => {
    if (protectErr) {
      console.log(protectErr);
      return res.status(500).json({ message: "Could not verify account restrictions" });
    }

    if (isProtected) {
      return res.status(403).json({ message: "Default admin password is protected" });
    }

    try {
      const rows = await queryAsync("SELECT password FROM user WHERE user_id = ?", [req.user.user_id]);
      if (!rows.length) {
        return res.status(404).json({ message: "User not found" });
      }

      const valid = await bcrypt.compare(currentPassword, rows[0].password);
      if (!valid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      const hashed = await bcrypt.hash(newPassword, 10);
      await queryAsync("UPDATE user SET password = ? WHERE user_id = ?", [hashed, req.user.user_id]);
      return res.json({ message: "Password updated successfully" });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: "Could not update password" });
    }
  });
});

app.get("/auth/profile", verifyToken, async (req, res) => {
  try {
    const users = await queryAsync(
      "SELECT user_id, email, role, username, academic_id FROM user WHERE user_id = ?",
      [req.user.user_id]
    );

    if (!users.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const base = users[0];
    if (base.role === "student") {
      const rows = await queryAsync(
        "SELECT student_id, name, department, year, semester, section, phone, academic_id FROM student WHERE user_id = ?",
        [req.user.user_id]
      );
      return res.json({ ...base, profile: rows[0] || {} });
    }

    if (base.role === "teacher") {
      const rows = await queryAsync(
        "SELECT faculty_id, name, department, phone, qualification, experience, academic_id FROM faculty WHERE user_id = ?",
        [req.user.user_id]
      );
      return res.json({ ...base, profile: rows[0] || {} });
    }

    const rows = await queryAsync(
      "SELECT admin_id, name, department, phone FROM admin WHERE user_id = ?",
      [req.user.user_id]
    );
    return res.json({ ...base, profile: rows[0] || {} });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Could not fetch profile" });
  }
});

app.put("/auth/profile", verifyToken, async (req, res) => {
  const { name, department, semester, section, year, phone, username, academic_id } = req.body;

  try {
    if (username) {
      await queryAsync("UPDATE user SET username = ? WHERE user_id = ?", [String(username).trim(), req.user.user_id]);
    }
    if (academic_id) {
      await queryAsync("UPDATE user SET academic_id = ? WHERE user_id = ?", [String(academic_id).trim(), req.user.user_id]);
    }

    if (req.user.role === "student") {
      const currentRows = await queryAsync(
        "SELECT year, semester FROM student WHERE user_id = ? LIMIT 1",
        [req.user.user_id]
      );
      if (!currentRows.length) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const yearProvided = year !== undefined && year !== null && String(year).trim() !== "";
      const semesterProvided = semester !== undefined && semester !== null && String(semester).trim() !== "";

      const resolvedYear = yearProvided ? year : currentRows[0].year;
      const resolvedSemester = semesterProvided ? semester : currentRows[0].semester;
      const validation = validateYearSemesterPair(resolvedYear, resolvedSemester);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.message });
      }

      const updateResult = await queryAsync(
        `
          UPDATE student
          SET
            name = COALESCE(?, name),
            department = COALESCE(?, department),
            semester = COALESCE(?, semester),
            section = COALESCE(?, section),
            year = COALESCE(?, year),
            phone = COALESCE(?, phone),
            academic_id = COALESCE(?, academic_id)
          WHERE user_id = ?
        `,
        [
          name || null,
          department || null,
          semesterProvided ? validation.semester : null,
          section || null,
          yearProvided ? validation.year : null,
          phone || null,
          academic_id || null,
          req.user.user_id
        ]
      );
      if (!updateResult.affectedRows) {
        return res.status(404).json({ message: "Student profile not found" });
      }
    } else if (req.user.role === "teacher") {
      const updateResult = await queryAsync(
        `
          UPDATE faculty
          SET
            name = COALESCE(?, name),
            department = COALESCE(?, department),
            phone = COALESCE(?, phone),
            academic_id = COALESCE(?, academic_id)
          WHERE user_id = ?
        `,
        [name || null, department || null, phone || null, academic_id || null, req.user.user_id]
      );
      if (!updateResult.affectedRows) {
        return res.status(404).json({ message: "Faculty profile not found" });
      }
    } else {
      isProtectedAdminByUserId(req.user.user_id, async (protectErr, isProtected) => {
        if (protectErr) {
          console.log(protectErr);
          return res.status(500).json({ message: "Could not verify account restrictions" });
        }

        try {
          // Protected admin can still update phone, while name/department stay locked.
          if (isProtected) {
            const phoneOnlyResult = await queryAsync(
              "UPDATE admin SET phone = COALESCE(?, phone) WHERE user_id = ?",
              [phone || null, req.user.user_id]
            );

            if (!phoneOnlyResult.affectedRows) {
              const baseRows = await queryAsync("SELECT username, email FROM user WHERE user_id = ? LIMIT 1", [req.user.user_id]);
              const fallbackName = name || baseRows[0]?.username || String(baseRows[0]?.email || "Admin").split("@")[0] || "Admin";
              await queryAsync(
                "INSERT INTO admin (user_id, name, department, phone) VALUES (?, ?, ?, ?)",
                [req.user.user_id, fallbackName, department || null, phone || null]
              );
            }
            return res.json({ message: "Phone updated successfully. Default admin name/department are protected." });
          }

          const adminUpdateResult = await queryAsync(
            `
              UPDATE admin
              SET
                name = COALESCE(?, name),
                department = COALESCE(?, department),
                phone = COALESCE(?, phone)
              WHERE user_id = ?
            `,
            [name || null, department || null, phone || null, req.user.user_id]
          );

          if (!adminUpdateResult.affectedRows) {
            const baseRows = await queryAsync("SELECT username, email FROM user WHERE user_id = ? LIMIT 1", [req.user.user_id]);
            const fallbackName = name || baseRows[0]?.username || String(baseRows[0]?.email || "Admin").split("@")[0] || "Admin";
            await queryAsync(
              "INSERT INTO admin (user_id, name, department, phone) VALUES (?, ?, ?, ?)",
              [req.user.user_id, fallbackName, department || null, phone || null]
            );
          }

          return res.json({ message: "Profile updated successfully" });
        } catch (adminErr) {
          console.log(adminErr);
          return res.status(500).json({ message: "Could not update profile" });
        }
      });
      return;
    }

    return res.json({ message: "Profile updated successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Could not update profile" });
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
        : null,
      examTypeColumn: columns.includes("exam_type")
        ? "exam_type"
        : columns.includes("result_type")
        ? "result_type"
        : columns.includes("exam")
        ? "exam"
        : null
    });
  });
};

const getResultSchemaAsync = () =>
  new Promise((resolve, reject) => {
    getResultSchema((err, schema) => {
      if (err) return reject(err);
      resolve(schema);
    });
  });

const getTeacherFacultyIdAsync = async (userId) => {
  const rows = await queryAsync("SELECT faculty_id FROM faculty WHERE user_id = ?", [userId]);
  return rows[0]?.faculty_id || null;
};

const isStudentAssignedToTeacherCourse = async (studentId, courseId, facultyId) => {
  const enrolledRows = await queryAsync(
    `
      SELECT enrollment_id
      FROM student_course
      WHERE student_id = ? AND course_id = ?
      LIMIT 1
    `,
    [studentId, courseId]
  );

  if (enrolledRows.length) return true;

  const classRows = await queryAsync(
    `
      SELECT cs.id
      FROM class_student cs
      JOIN class_group cg ON cg.class_id = cs.class_id
      WHERE cs.student_id = ?
        AND cg.course_id = ?
        AND cg.professor_id = ?
      LIMIT 1
    `,
    [studentId, courseId, facultyId]
  );

  return classRows.length > 0;
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

// ===== ADMIN ENDPOINTS =====
// Get all admins
app.get("/admin/list", verifyToken, checkRole(["admin"]), (req, res) => {
  db.query("SELECT admin_id, user_id, name, department, phone FROM admin", (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Error fetching admins");
    } else {
      res.json(result);
    }
  });
});

app.get("/admin/users", verifyToken, checkRole(["admin"]), async (req, res) => {
  try {
    const rows = await queryAsync(
      `
        SELECT user_id, email, role, username, academic_id, is_active, created_at
        FROM user
        ORDER BY created_at DESC
      `
    );
    return res.json(rows);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error fetching users" });
  }
});

app.put("/admin/users/:id", verifyToken, checkRole(["admin"]), async (req, res) => {
  const userId = Number(req.params.id);
  const { email, username, academic_id, is_active } = req.body;

  try {
    const rows = await queryAsync("SELECT role, email FROM user WHERE user_id = ?", [userId]);
    if (!rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const target = rows[0];
    if (target.role === "admin" && PROTECTED_ADMIN_EMAILS.has(String(target.email || "").toLowerCase())) {
      return res.status(403).json({ message: "Protected default admin account cannot be edited" });
    }

    await queryAsync(
      `
        UPDATE user
        SET
          email = COALESCE(?, email),
          username = COALESCE(?, username),
          academic_id = COALESCE(?, academic_id),
          is_active = COALESCE(?, is_active)
        WHERE user_id = ?
      `,
      [email || null, username || null, academic_id || null, typeof is_active === "boolean" ? is_active : null, userId]
    );

    await createAuditLog({
      action: "user.update",
      actor_user_id: req.user.user_id,
      target_type: "user",
      target_id: userId,
      details: { email: email || undefined, username: username || undefined, academic_id: academic_id || undefined, is_active },
      req
    });

    return res.json({ message: "User updated" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error updating user" });
  }
});

app.delete("/admin/users/:id", verifyToken, checkRole(["admin"]), async (req, res) => {
  const userId = Number(req.params.id);
  try {
    const rows = await queryAsync("SELECT role, email FROM user WHERE user_id = ?", [userId]);
    if (!rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const target = rows[0];
    if (target.role === "admin" && PROTECTED_ADMIN_EMAILS.has(String(target.email || "").toLowerCase())) {
      return res.status(403).json({ message: "Protected default admin account cannot be deleted" });
    }

    await queryAsync("DELETE FROM user WHERE user_id = ?", [userId]);
    await createAuditLog({
      action: "user.delete",
      actor_user_id: req.user.user_id,
      target_type: "user",
      target_id: userId,
      details: { role: target.role, email: target.email },
      req
    });
    return res.json({ message: "User deleted" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error deleting user" });
  }
});

// Get admin dashboard statistics
app.get("/admin/stats", verifyToken, checkRole(["admin"]), (req, res) => {
  const statsQuery = `
    SELECT 
      (SELECT COUNT(*) FROM student) as total_students,
      (SELECT COUNT(*) FROM faculty) as total_faculty,
      (SELECT COUNT(*) FROM course) as total_courses,
      (SELECT COUNT(*) FROM class_group) as total_classes,
      (
        SELECT COALESCE(ROUND((SUM(CASE WHEN LOWER(status) IN ('present') THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0), 2), 0)
        FROM class_attendance
      ) as average_attendance,
      (SELECT COUNT(*) FROM user) as total_users
  `;

  db.query(statsQuery, (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).json({ message: "Error fetching statistics" });
    } else {
      res.json(result[0]);
    }
  });
});

// Get all faculty/teachers
app.get("/admin/faculty", verifyToken, checkRole(["admin"]), (req, res) => {
  db.query(
    `
      SELECT
        f.faculty_id,
        f.user_id,
        f.name,
        f.department,
        f.phone,
        f.academic_id,
        f.qualification,
        f.experience,
        u.email
      FROM faculty f
      LEFT JOIN user u ON f.user_id = u.user_id
    `,
    (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Error fetching faculty");
    } else {
      res.json(result);
    }
    }
  );
});

// Add new faculty
app.post("/admin/faculty", verifyToken, checkRole(["admin"]), async (req, res) => {
  const { email, password, name, department, phone, qualification, experience, academic_id } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ message: "Email, password, and name are required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await runInTransaction(async () => {
      const userResult = await queryAsync(
        "INSERT INTO user (email, password, role) VALUES (?, ?, ?)",
        [email, hashedPassword, "teacher"]
      );
      const userId = userResult.insertId;
      const facultyResult = await queryAsync(
        "INSERT INTO faculty (user_id, name, department, phone, qualification, experience, academic_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [userId, name, department || "General", phone || "", qualification || "", experience || 0, academic_id || emailPrefix(email)]
      );
      return { userId, facultyId: facultyResult.insertId };
    });

    await createAuditLog({
      action: "faculty.create",
      actor_user_id: req.user.user_id,
      target_type: "faculty",
      target_id: result.facultyId,
      details: { email, name },
      req
    });

    return res.status(201).json({ message: "Faculty added successfully", faculty_id: result.facultyId });
  } catch (err) {
    console.log(err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Email/academic ID already exists" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// Update faculty
app.put("/admin/faculty/:id", verifyToken, checkRole(["admin"]), (req, res) => {
  const { id } = req.params;
  const { name, department, phone, qualification, experience, academic_id } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Name is required" });
  }

  const query = `
    UPDATE faculty
    SET name = ?, department = ?, phone = ?, qualification = ?, experience = ?, academic_id = ?
    WHERE faculty_id = ?
  `;

  db.query(
    query,
    [name, department || "", phone || "", qualification || "", Number(experience) || 0, academic_id || null, id],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Error updating faculty" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Faculty not found" });
      }

      res.json({ message: "Faculty updated successfully" });
    }
  );
});

// Delete faculty
app.delete("/admin/faculty/:id", verifyToken, checkRole(["admin"]), (req, res) => {
  const { id } = req.params;

  db.query("SELECT user_id FROM faculty WHERE faculty_id = ?", [id], (err, result) => {
    if (err || !result.length) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    const userId = result[0].user_id;

    db.query("DELETE FROM faculty WHERE faculty_id = ?", [id], (err) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Error deleting faculty" });
      }

      db.query("DELETE FROM user WHERE user_id = ?", [userId], (err) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ message: "Error deleting user account" });
        }

        res.json({ message: "Faculty deleted successfully" });
      });
    });
  });
});

// Test route
app.get("/", (req, res) => {
  res.send("College ERP Backend Running with Authentication ✅");
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {

    console.error(`❌ Port ${PORT} is already in use. Stop the existing backend instance before starting a new one.`);
    process.exit(1);
  }

  console.error("❌ Server startup error:", err);
  process.exit(1);
});

app.get("/attendance", verifyToken, checkRole(["admin", "teacher", "student"]), (req, res) => {
  const { student_id, course_id, status, date, from_date, to_date } = req.query;

  if (req.user.role === "teacher") {
    return getFacultyIdByUserId(req.user.user_id, (facultyErr, facultyId) => {
      if (facultyErr) {
        return res.status(404).json({ message: "Faculty profile not found" });
      }

      const teacherFilters = ["c.faculty_id = ?"];
      const teacherParams = [facultyId];

      if (student_id) {
        teacherFilters.push("a.student_id = ?");
        teacherParams.push(Number(student_id));
      }
      if (course_id) {
        teacherFilters.push("a.course_id = ?");
        teacherParams.push(Number(course_id));
      }
      if (status) {
        teacherFilters.push("LOWER(a.status) = LOWER(?)");
        teacherParams.push(String(status));
      }
      if (date) {
        teacherFilters.push("DATE(a.date) = ?");
        teacherParams.push(date);
      }
      if (from_date) {
        teacherFilters.push("DATE(a.date) >= ?");
        teacherParams.push(from_date);
      }
      if (to_date) {
        teacherFilters.push("DATE(a.date) <= ?");
        teacherParams.push(to_date);
      }

      const teacherQuery = `
        SELECT a.attendance_id, a.student_id, s.name AS student,
               c.course_name AS course,
               a.date, a.status, a.course_id
        FROM attendance a
        JOIN student s ON a.student_id = s.student_id
        JOIN course c ON a.course_id = c.course_id
        WHERE ${teacherFilters.join(" AND ")}
      `;

      db.query(teacherQuery, teacherParams, (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).send("Error fetching attendance");
        }
        res.json(result);
      });
    });
  }

  const filters = ["1=1"];
  const params = [];

  if (student_id) {
    filters.push("a.student_id = ?");
    params.push(Number(student_id));
  }
  if (course_id) {
    filters.push("a.course_id = ?");
    params.push(Number(course_id));
  }
  if (status) {
    filters.push("LOWER(a.status) = LOWER(?)");
    params.push(String(status));
  }
  if (date) {
    filters.push("DATE(a.date) = ?");
    params.push(date);
  }
  if (from_date) {
    filters.push("DATE(a.date) >= ?");
    params.push(from_date);
  }
  if (to_date) {
    filters.push("DATE(a.date) <= ?");
    params.push(to_date);
  }

  const query = `
    SELECT a.attendance_id, a.student_id, s.name AS student,
           c.course_name AS course,
           a.date, a.status, a.course_id
    FROM attendance a
    JOIN student s ON a.student_id = s.student_id
    JOIN course c ON a.course_id = c.course_id
    WHERE ${filters.join(" AND ")}
  `;

  db.query(query, params, (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Error fetching attendance");
    } else {
      res.json(result);
    }
  });
});

app.post("/attendance", verifyToken, checkRole(["admin", "teacher"]), (req, res) => {
  const { student_id, course_id, date, status } = req.body;

  const hasDuplicateAttendance = (callback) => {
    const duplicateQuery = `
      SELECT attendance_id
      FROM attendance
      WHERE student_id = ? AND course_id = ? AND date = ?
      LIMIT 1
    `;

    db.query(duplicateQuery, [student_id, course_id, date], (dupErr, dupRows) => {
      if (dupErr) {
        console.log(dupErr);
        return res.status(500).send("Error validating attendance record");
      }

      if (dupRows.length) {
        return res.status(409).send("Attendance already marked for this student, course, and date");
      }

      callback();
    });
  };

  const insertAttendance = () => {
    hasDuplicateAttendance(() => {
      const query = `
        INSERT INTO attendance (student_id, course_id, date, status)
        VALUES (?, ?, ?, ?)
      `;

      db.query(query, [student_id, course_id, date, status], (err) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).send("Attendance already marked for this student, course, and date");
          }
          console.log(err);
          return res.status(500).send("Error inserting attendance");
        }

        syncAttendanceRiskNotificationsForStudent(Number(student_id), req.user.user_id);
        res.send("Attendance added successfully");
      });
    });
  };

  if (req.user.role === "admin") {
    return insertAttendance();
  }

  getFacultyIdByUserId(req.user.user_id, (facultyErr, facultyId) => {
    if (facultyErr) {
      return res.status(404).json({ message: "Faculty profile not found" });
    }

    const teacherCourseQuery = "SELECT course_id FROM course WHERE course_id = ? AND faculty_id = ?";
    db.query(teacherCourseQuery, [course_id, facultyId], (courseErr, courseRows) => {
      if (courseErr) {
        console.log(courseErr);
        return res.status(500).json({ message: "Error validating course access" });
      }

      if (!courseRows.length) {
        return res.status(403).json({ message: "You can only mark attendance for your assigned courses" });
      }

      const enrollmentQuery = `
        SELECT enrollment_id FROM student_course WHERE student_id = ? AND course_id = ?
      `;
      db.query(enrollmentQuery, [student_id, course_id], (enrollErr, enrollRows) => {
        if (enrollErr) {
          console.log(enrollErr);
          return res.status(500).json({ message: "Error validating student enrollment" });
        }

        if (enrollRows.length) {
          return insertAttendance();
        }

        const classAssignmentQuery = `
          SELECT cs.id
          FROM class_student cs
          JOIN class_group cg ON cg.class_id = cs.class_id
          WHERE cs.student_id = ?
            AND cg.course_id = ?
            AND cg.professor_id = ?
          LIMIT 1
        `;

        db.query(classAssignmentQuery, [student_id, course_id, facultyId], (classErr, classRows) => {
          if (classErr) {
            console.log(classErr);
            return res.status(500).json({ message: "Error validating class assignment" });
          }

          if (!classRows.length) {
            return res.status(400).json({ message: "Student is not assigned to this course or class" });
          }

          insertAttendance();
        });
      });
    });
  });
});

app.put("/attendance/:attendanceId", verifyToken, checkRole(["admin", "teacher"]), (req, res) => {
  const attendanceId = Number(req.params.attendanceId);
  const { student_id, course_id, date, status } = req.body;

  if (!attendanceId || Number.isNaN(attendanceId)) {
    return res.status(400).json({ message: "Valid attendance ID is required" });
  }

  if (!student_id || !course_id || !date || !status) {
    return res.status(400).json({ message: "student_id, course_id, date and status are required" });
  }

  if (!["Present", "Absent"].includes(String(status))) {
    return res.status(400).json({ message: "Status must be Present or Absent" });
  }

  const ensureNoDuplicateAndUpdate = () => {
    const duplicateQuery = `
      SELECT attendance_id
      FROM attendance
      WHERE student_id = ? AND course_id = ? AND date = ? AND attendance_id <> ?
      LIMIT 1
    `;

    db.query(duplicateQuery, [student_id, course_id, date, attendanceId], (dupErr, dupRows) => {
      if (dupErr) {
        console.log(dupErr);
        return res.status(500).json({ message: "Error validating duplicate attendance" });
      }

      if (dupRows.length) {
        return res.status(409).json({ message: "Attendance already marked for this student, course, and date" });
      }

      const updateQuery = `
        UPDATE attendance
        SET student_id = ?, course_id = ?, date = ?, status = ?
        WHERE attendance_id = ?
      `;

      db.query(updateQuery, [student_id, course_id, date, status, attendanceId], (updateErr, updateResult) => {
        if (updateErr) {
          if (updateErr.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "Attendance already marked for this student, course, and date" });
          }
          console.log(updateErr);
          return res.status(500).json({ message: "Error updating attendance" });
        }

        if (!updateResult.affectedRows) {
          return res.status(404).json({ message: "Attendance record not found" });
        }

        syncAttendanceRiskNotificationsForStudent(Number(student_id), req.user.user_id);

        return res.json({ message: "Attendance updated successfully" });
      });
    });
  };

  if (req.user.role === "admin") {
    return ensureNoDuplicateAndUpdate();
  }

  getFacultyIdByUserId(req.user.user_id, (facultyErr, facultyId) => {
    if (facultyErr) {
      return res.status(404).json({ message: "Faculty profile not found" });
    }

    const teacherCourseQuery = "SELECT course_id FROM course WHERE course_id = ? AND faculty_id = ?";
    db.query(teacherCourseQuery, [course_id, facultyId], (courseErr, courseRows) => {
      if (courseErr) {
        console.log(courseErr);
        return res.status(500).json({ message: "Error validating course access" });
      }

      if (!courseRows.length) {
        return res.status(403).json({ message: "You can only edit attendance for your assigned courses" });
      }

      const enrollmentQuery = "SELECT enrollment_id FROM student_course WHERE student_id = ? AND course_id = ?";
      db.query(enrollmentQuery, [student_id, course_id], (enrollErr, enrollRows) => {
        if (enrollErr) {
          console.log(enrollErr);
          return res.status(500).json({ message: "Error validating student enrollment" });
        }

        if (enrollRows.length) {
          return ensureNoDuplicateAndUpdate();
        }

        const classAssignmentQuery = `
          SELECT cs.id
          FROM class_student cs
          JOIN class_group cg ON cg.class_id = cs.class_id
          WHERE cs.student_id = ?
            AND cg.course_id = ?
            AND cg.professor_id = ?
          LIMIT 1
        `;

        db.query(classAssignmentQuery, [student_id, course_id, facultyId], (classErr, classRows) => {
          if (classErr) {
            console.log(classErr);
            return res.status(500).json({ message: "Error validating class assignment" });
          }

          if (!classRows.length) {
            return res.status(400).json({ message: "Student is not assigned to this course or class" });
          }

          return ensureNoDuplicateAndUpdate();
        });
      });
    });
  });
});

app.get("/students", verifyToken, checkRole(["admin", "teacher", "student"]), (req, res) => {
  if (req.user.role === "admin") {
    return db.query("SELECT student_id, user_id, name, department, year, semester, section, roll_number, phone, academic_id, enrollment_date FROM student", (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error fetching students");
      } else {
        res.json(result);
      }
    });
  }

  if (req.user.role === "teacher") {
    return getFacultyIdByUserId(req.user.user_id, (facultyErr, facultyId) => {
      if (facultyErr) {
        return res.status(404).json({ message: "Faculty profile not found" });
      }

      const query = `
        SELECT DISTINCT s.student_id, s.user_id, s.name, s.department, s.year, s.semester, s.section, s.roll_number, s.phone, s.academic_id, s.enrollment_date
        FROM student s
        WHERE EXISTS (
          SELECT 1
          FROM student_course sc
          JOIN course c ON c.course_id = sc.course_id
          WHERE sc.student_id = s.student_id AND c.faculty_id = ?
        )
        OR EXISTS (
          SELECT 1
          FROM class_student cs
          JOIN class_group cg ON cg.class_id = cs.class_id
          WHERE cs.student_id = s.student_id AND cg.professor_id = ?
        )
        ORDER BY s.name
      `;

      db.query(query, [facultyId, facultyId], (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).send("Error fetching students");
        }
        res.json(result);
      });
    });
  }

  getStudentIdByUserId(req.user.user_id, (studentErr, studentId) => {
    if (studentErr) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    db.query(
      "SELECT student_id, user_id, name, department, year, semester, section, roll_number, phone, academic_id, enrollment_date FROM student WHERE student_id = ?",
      [studentId],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).send("Error fetching students");
        }
        res.json(result);
      }
    );
  });
});

app.post("/students", verifyToken, checkRole(["admin"]), async (req, res) => {
  const { name, department, year, semester, section, phone, email, password, academic_id, username } = req.body;

  if (!name || !department || !year || !semester || !phone) {
    return res.status(400).json({ message: "All student fields are required" });
  }

  const validation = validateYearSemesterPair(year, semester);
  if (!validation.valid) {
    return res.status(400).json({ message: validation.message });
  }

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required to create student account" });
  }

  try {
    const role = "student";
    const hashedPassword = await bcrypt.hash(password, 10);

    const computedUsername = String(username || emailPrefix(email)).trim();
    const computedAcademicId = String(academic_id || computedUsername).trim();

    const created = await runInTransaction(async () => {
      const userResult = await queryAsync(
        "INSERT INTO user (email, password, role, username, academic_id) VALUES (?, ?, ?, ?, ?)",
        [email, hashedPassword, role, computedUsername, computedAcademicId]
      );

      const userId = userResult.insertId;
      const rollNumber = `STU${userId}${Date.now()}`.substring(0, 20);
      const studentResult = await queryAsync(
        "INSERT INTO student (user_id, name, department, year, semester, section, roll_number, phone, academic_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [userId, name, department, validation.year, validation.semester, section || "A", rollNumber, phone, computedAcademicId]
      );

      return { userId, studentId: studentResult.insertId };
    });

    await createAuditLog({
      action: "student.create",
      actor_user_id: req.user.user_id,
      target_type: "student",
      target_id: created.studentId,
      details: { email, name, department, year },
      req
    });

    return res.status(201).json({
      message: "Student added successfully",
      student_id: created.studentId
    });
  } catch (err) {
    console.log(err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Email/academic ID already exists" });
    }
    return res.status(500).json({ message: "Error creating student profile" });
  }
});

app.put("/students/:id", verifyToken, checkRole(["admin"]), (req, res) => {
  const { id } = req.params;
  const { name, department, year, semester, section, phone, academic_id } = req.body;

  if (!name || !department || !year || !semester || !phone) {
    return res.status(400).json({ message: "All student fields are required" });
  }

  const validation = validateYearSemesterPair(year, semester);
  if (!validation.valid) {
    return res.status(400).json({ message: validation.message });
  }

  const query = `
    UPDATE student
    SET name = ?, department = ?, year = ?, semester = ?, section = ?, phone = ?, academic_id = ?
    WHERE student_id = ?
  `;

  db.query(query, [name, department, validation.year, validation.semester, section || null, phone, academic_id || null, id], (err, result) => {
    if (err) {
      console.log("update student error", err);
      return res.status(500).json({ message: "Error updating student" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json({ message: "Student updated successfully" });
  });
});

app.delete("/students/:id", verifyToken, checkRole(["admin"]), (req, res) => {
  const { id } = req.params;

  // Get user_id first
  db.query("SELECT user_id FROM student WHERE student_id = ?", [id], (err, result) => {
    if (err || !result.length) {
      return res.status(404).json({ message: "Student not found" });
    }

    const userId = result[0].user_id;

    // Delete student record
    db.query("DELETE FROM student WHERE student_id = ?", [id], (err) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Error deleting student" });
      }

      // Delete user account
      db.query("DELETE FROM user WHERE user_id = ?", [userId], (err) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ message: "Error deleting user account" });
        }

        res.json({ message: "Student deleted successfully" });
      });
    });
  });
});


app.get("/attendance-report", verifyToken, checkRole(["admin", "teacher"]), async (req, res) => {
  try {
    const filters = [];
    const params = [];

    if (req.user.role === "teacher") {
      const facultyId = await getTeacherFacultyIdAsync(req.user.user_id);
      if (!facultyId) {
        return res.status(404).json({ message: "Faculty profile not found" });
      }
      filters.push("c.faculty_id = ?");
      params.push(facultyId);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const rows = await queryAsync(
      `
        SELECT
          a.student_id,
          s.name AS student_name,
          a.course_id,
          c.course_name,
          COUNT(*) AS total_sessions,
          SUM(CASE WHEN LOWER(a.status) = 'present' THEN 1 ELSE 0 END) AS present_count,
          SUM(CASE WHEN LOWER(a.status) = 'absent' THEN 1 ELSE 0 END) AS absent_count,
          ROUND((SUM(CASE WHEN LOWER(a.status) = 'present' THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0), 2) AS attendance_percentage
        FROM attendance a
        JOIN student s ON s.student_id = a.student_id
        JOIN course c ON c.course_id = a.course_id
        ${whereClause}
        GROUP BY a.student_id, a.course_id, s.name, c.course_name
        ORDER BY c.course_name ASC, s.name ASC
      `,
      params
    );

    return res.json(rows);
  } catch (err) {
    console.log(err);
    return res.status(500).send("Error fetching report");
  }
});

// ===== COURSES ENDPOINTS =====
app.get("/courses", verifyToken, checkRole(["admin", "teacher", "student"]), (req, res) => {
  const baseQuery = `
    SELECT c.*, f.name AS faculty_name
    FROM course c
    LEFT JOIN faculty f ON c.faculty_id = f.faculty_id
  `;

  if (req.user.role === "admin") {
    return db.query(`${baseQuery} ORDER BY c.course_name`, (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error fetching courses");
      } else {
        res.json(result);
      }
    });
  }

  if (req.user.role === "teacher") {
    return getFacultyIdByUserId(req.user.user_id, (facultyErr, facultyId) => {
      if (facultyErr) {
        return res.status(404).json({ message: "Faculty profile not found" });
      }

      db.query(`${baseQuery} WHERE c.faculty_id = ? ORDER BY c.course_name`, [facultyId], (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).send("Error fetching courses");
        }
        res.json(result);
      });
    });
  }

  getStudentIdByUserId(req.user.user_id, (studentErr, studentId) => {
    if (studentErr) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const studentQuery = `
      SELECT c.*, f.name AS faculty_name
      FROM course c
      JOIN student_course sc ON sc.course_id = c.course_id
      LEFT JOIN faculty f ON c.faculty_id = f.faculty_id
      WHERE sc.student_id = ?
      ORDER BY c.course_name
    `;

    db.query(studentQuery, [studentId], (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send("Error fetching courses");
      }
      res.json(result);
    });
  });
});

app.post("/courses", verifyToken, checkRole(["admin"]), (req, res) => {
  const { course_name, course_code, semester, department, description, faculty_id, credits } = req.body;

  if (!course_name || !department) {
    return res.status(400).send("Course name and department are required");
  }

  const computedCode = String(course_code || `${course_name.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-5)}`).trim();

  const normalizedFacultyId = faculty_id ? Number(faculty_id) : null;
  if (faculty_id && Number.isNaN(normalizedFacultyId)) {
    return res.status(400).send("Invalid faculty selected");
  }

  const normalizedCredits = credits === undefined || credits === null || credits === ""
    ? 4
    : Number(credits);
  if (Number.isNaN(normalizedCredits) || normalizedCredits <= 0) {
    return res.status(400).send("Credits must be a positive number");
  }

  const query = `
    INSERT INTO course (course_name, course_code, semester, department, description, faculty_id, credits)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [course_name, computedCode, semester || null, department, description || "", normalizedFacultyId, normalizedCredits], (err, result) => {
    if (err) {
      console.log("add course error", err);
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).send("Course code must be unique");
      }
      const msg = err.message || "Error adding course";
      return res.status(500).send(msg);
    }

    res.status(201).json({
      message: "Course added successfully",
      course_id: result.insertId
    });
  });
});

app.put("/courses/:id", verifyToken, checkRole(["admin"]), (req, res) => {
  const { id } = req.params;
  const { course_name, course_code, semester, department, description, faculty_id, credits } = req.body;

  if (!course_name || !department) {
    return res.status(400).send("Course name and department are required");
  }

  const normalizedFacultyId = faculty_id ? Number(faculty_id) : null;
  if (faculty_id && Number.isNaN(normalizedFacultyId)) {
    return res.status(400).send("Invalid faculty selected");
  }

  const normalizedCredits = credits === undefined || credits === null || credits === ""
    ? 4
    : Number(credits);
  if (Number.isNaN(normalizedCredits) || normalizedCredits <= 0) {
    return res.status(400).send("Credits must be a positive number");
  }

  const query = `
    UPDATE course
    SET course_name = ?, course_code = ?, semester = ?, department = ?, description = ?, faculty_id = ?, credits = ?
    WHERE course_id = ?
  `;

  db.query(query, [course_name, course_code || null, semester || null, department, description || "", normalizedFacultyId, normalizedCredits, id], (err, result) => {
    if (err) {
      console.log("update course error", err);
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).send("Course code must be unique");
      }
      const msg = err.message || "Error updating course";
      return res.status(500).send(msg);
    }

    if (result.affectedRows === 0) {
      return res.status(404).send("Course not found");
    }

    res.json({ message: "Course updated successfully" });
  });
});

app.delete("/courses/:id", verifyToken, checkRole(["admin"]), (req, res) => {
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
app.get("/stats", verifyToken, checkRole(["admin", "teacher", "student"]), (req, res) => {
  const statsQuery = `
    SELECT 
      (SELECT COUNT(*) FROM student) as total_students,
      (SELECT COUNT(*) FROM course) as total_courses,
      (SELECT COUNT(*) FROM faculty) as total_faculty,
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

// ===== ROLE DASHBOARD ENDPOINTS =====
app.get("/dashboard/teacher", verifyToken, checkRole(["teacher", "admin"]), (req, res) => {
  if (req.user.role === "teacher") {
    return getFacultyIdByUserId(req.user.user_id, (facultyErr, facultyId) => {
      if (facultyErr) {
        return res.status(404).json({ message: "Faculty profile not found" });
      }

      const teacherStatsQuery = `
        SELECT
          (SELECT COUNT(*) FROM course WHERE faculty_id = ?) AS courses,
          (
            SELECT COUNT(DISTINCT assigned_students.student_id)
            FROM (
              SELECT sc.student_id
              FROM student_course sc
              JOIN course c ON c.course_id = sc.course_id
              WHERE c.faculty_id = ?
              UNION
              SELECT cs.student_id
              FROM class_student cs
              JOIN class_group cg ON cg.class_id = cs.class_id
              WHERE cg.professor_id = ?
            ) assigned_students
          ) AS students,
          (
            SELECT COUNT(DISTINCT marked_students.student_id)
            FROM (
              SELECT a.student_id
              FROM attendance a
              JOIN course c ON c.course_id = a.course_id
              WHERE c.faculty_id = ? AND DATE(a.date) = CURDATE()
              UNION
              SELECT ca.student_id
              FROM class_attendance ca
              JOIN class_group cg ON cg.class_id = ca.class_id
              WHERE cg.professor_id = ? AND ca.session_date = CURDATE()
            ) marked_students
          ) AS attendance_marked_today,
          (
            SELECT COUNT(DISTINCT s.student_id)
            FROM student s
            JOIN student_course sc ON sc.student_id = s.student_id
            JOIN course c ON c.course_id = sc.course_id
            WHERE c.faculty_id = ?
              AND NOT EXISTS (
                SELECT 1
                FROM result r
                WHERE r.student_id = s.student_id
                  AND r.course_id = c.course_id
              )
          ) AS students_without_results
      `;

      db.query(teacherStatsQuery, [facultyId, facultyId, facultyId, facultyId, facultyId, facultyId], (err, rows) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ message: "Error fetching teacher dashboard statistics" });
        }

        const data = rows[0] || {};
        const totalStudents = Number(data.students || 0);
        const markedToday = Number(data.attendance_marked_today || 0);
        const pendingAttendance = Math.max(totalStudents - markedToday, 0);
        const pendingResults = Number(data.students_without_results || 0);

        res.json({
          courses: Number(data.courses || 0),
          students: totalStudents,
          pendingAttendance,
          pendingResults,
          classesToday: Number(data.courses || 0),
          studentsToMark: pendingAttendance,
          pendingActivities: pendingAttendance + pendingResults
        });
      });
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const query = `
    SELECT
      (SELECT COUNT(*) FROM course) AS courses,
      (SELECT COUNT(*) FROM student) AS students,
      (
        SELECT COUNT(DISTINCT student_id)
        FROM attendance
        WHERE DATE(date) = ?
      ) AS attendance_marked_today,
      (
        SELECT COUNT(*)
        FROM student s
        WHERE NOT EXISTS (
          SELECT 1 FROM result r WHERE r.student_id = s.student_id
        )
      ) AS students_without_results
  `;

  db.query(query, [today], (err, rows) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: "Error fetching teacher dashboard statistics" });
    }

    const data = rows[0] || {};
    const totalStudents = Number(data.students || 0);
    const markedToday = Number(data.attendance_marked_today || 0);
    const pendingAttendance = Math.max(totalStudents - markedToday, 0);
    const pendingResults = Number(data.students_without_results || 0);

    res.json({
      courses: Number(data.courses || 0),
      students: totalStudents,
      pendingAttendance,
      pendingResults,
      classesToday: Number(data.courses || 0),
      studentsToMark: pendingAttendance,
      pendingActivities: pendingAttendance + pendingResults
    });
  });
});

app.get("/dashboard/student", verifyToken, checkRole(["student", "admin"]), (req, res) => {
  const userId = req.user.user_id;

  db.query("SELECT student_id FROM student WHERE user_id = ?", [userId], (studentErr, studentRows) => {
    if (studentErr) {
      console.log(studentErr);
      return res.status(500).json({ message: "Error resolving student profile" });
    }

    if (!studentRows.length) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const studentId = studentRows[0].student_id;

    const statsQuery = `
      SELECT
        (SELECT COUNT(*) FROM student_course WHERE student_id = ?) AS enrolledCourses,
        (
          SELECT CASE
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND(SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) * 100 / COUNT(*), 2)
          END
          FROM attendance
          WHERE student_id = ?
        ) AS attendancePercentage,
        (SELECT COUNT(*) FROM result WHERE student_id = ?) AS resultsPublished,
        (
          SELECT CASE
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND(AVG((marks_obtained * 100) / NULLIF(total_marks, 0)), 2)
          END
          FROM result
          WHERE student_id = ?
        ) AS averageScore
    `;

    db.query(statsQuery, [studentId, studentId, studentId, studentId], (statsErr, statsRows) => {
      if (statsErr) {
        console.log(statsErr);
        return res.status(500).json({ message: "Error fetching student dashboard statistics" });
      }

      const coursesQuery = `
        SELECT c.course_id, c.course_name, c.department
        FROM student_course sc
        JOIN course c ON sc.course_id = c.course_id
        WHERE sc.student_id = ?
        ORDER BY c.course_name
      `;

      db.query(coursesQuery, [studentId], (coursesErr, coursesRows) => {
        if (coursesErr) {
          console.log(coursesErr);
          return res.status(500).json({ message: "Error fetching student courses" });
        }

        const weeklyClassesQuery = `
          SELECT
            t.timetable_id,
            t.day_of_week,
            t.start_time,
            t.end_time,
            t.room_number,
            t.session_type,
            c.course_id,
            c.course_name,
            c.course_code,
            c.department
          FROM timetable_entry t
          JOIN student_course sc ON sc.course_id = t.course_id
          JOIN course c ON c.course_id = t.course_id
          WHERE sc.student_id = ?
          ORDER BY FIELD(t.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'), t.start_time
        `;

        db.query(weeklyClassesQuery, [studentId], (weeklyErr, weeklyClassRows) => {
          if (weeklyErr) {
            console.log(weeklyErr);
            return res.status(500).json({ message: "Error fetching weekly classes" });
          }

          const stats = statsRows[0] || {};
          const attendancePercentage = Number(stats.attendancePercentage || 0);

          let academicStatus = "Needs Attention";
          if (attendancePercentage >= 75) {
            academicStatus = "Good";
          } else if (attendancePercentage >= 50) {
            academicStatus = "Average";
          }
          
          const todayClasses = weeklyClassRows.filter(row => {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return row.day_of_week === days[new Date().getDay()];
          });

          res.json({
            studentId,
            enrolledCourses: Number(stats.enrolledCourses || 0),
            attendancePercentage,
            resultsPublished: Number(stats.resultsPublished || 0),
            averageScore: Number(stats.averageScore || 0),
            academicStatus,
            courses: coursesRows || [],
            todayClasses: todayClasses || [],
            weeklyClasses: weeklyClassRows || []
          });
        });
      });
    });
  });
});

app.get("/attendance/student/me", verifyToken, checkRole(["student", "admin"]), (req, res) => {
  const userId = req.user.user_id;

  db.query("SELECT student_id FROM student WHERE user_id = ?", [userId], (studentErr, studentRows) => {
    if (studentErr) {
      console.log(studentErr);
      return res.status(500).json({ message: "Error resolving student profile" });
    }

    if (!studentRows.length) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const studentId = studentRows[0].student_id;

    const query = `
      SELECT
        a.attendance_id,
        a.student_id,
        a.course_id,
        a.date AS attendance_date,
        a.status,
        c.course_name
      FROM attendance a
      JOIN course c ON c.course_id = a.course_id
      WHERE a.student_id = ?
      ORDER BY a.date DESC
    `;

    db.query(query, [studentId], (err, rows) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Error fetching attendance timeline" });
      }

      res.json(rows || []);
    });
  });
});

// ===== RESULTS ENDPOINTS =====
app.get("/results", verifyToken, checkRole(["admin", "teacher", "student"]), async (req, res) => {
  try {
    const schema = await getResultSchemaAsync();
    if (!schema.idColumn || !schema.marksColumn || !schema.totalColumn) {
      return res.status(500).send("Result table schema is not supported");
    }

    let whereClause = "";
    const params = [];

    if (req.user.role === "teacher") {
      const facultyId = await getTeacherFacultyIdAsync(req.user.user_id);
      if (!facultyId) {
        return res.status(404).json({ message: "Faculty profile not found" });
      }
      whereClause = "WHERE c.faculty_id = ?";
      params.push(facultyId);
    } else if (req.user.role === "student") {
      const studentRows = await queryAsync("SELECT student_id FROM student WHERE user_id = ?", [req.user.user_id]);
      const studentId = studentRows[0]?.student_id;
      if (!studentId) {
        return res.status(404).json({ message: "Student profile not found" });
      }
      whereClause = "WHERE r.student_id = ?";
      params.push(studentId);
    }

    const query = `
      SELECT
        r.${schema.idColumn} AS result_id,
        r.student_id,
        r.course_id,
        ${schema.examTypeColumn ? `LOWER(COALESCE(r.${schema.examTypeColumn}, 'semester'))` : "'semester'"} AS exam_type,
        r.${schema.marksColumn} AS marks_obtained,
        r.${schema.totalColumn} AS total_marks,
        s.name AS student_name,
        c.course_name AS course_name,
        c.credits AS credits
      FROM result r
      JOIN student s ON r.student_id = s.student_id
      JOIN course c ON r.course_id = c.course_id
      ${whereClause}
      ORDER BY r.${schema.idColumn} DESC
    `;

    const rows = await queryAsync(query, params);
    return res.json(rows);
  } catch (err) {
    console.log("result schema error", err);
    return res.status(500).send("Error fetching results");
  }
});

app.post("/results", verifyToken, checkRole(["admin", "teacher"]), async (req, res) => {
  const { student_id, course_id, marks_obtained, total_marks, exam_type } = req.body;

  if (!student_id || !course_id || marks_obtained === undefined || marks_obtained === null || !total_marks) {
    return res.status(400).send("All result fields are required");
  }

  try {
    const schema = await getResultSchemaAsync();
    if (!schema.marksColumn || !schema.totalColumn) {
      return res.status(500).send("Result table schema is not supported");
    }

    const normalizedExamType = String(exam_type || "semester").toLowerCase();
    if (!["midsem", "endsem", "semester"].includes(normalizedExamType)) {
      return res.status(400).json({ message: "exam_type must be midsem, endsem or semester" });
    }

    if (req.user.role === "teacher") {
      const facultyId = await getTeacherFacultyIdAsync(req.user.user_id);
      if (!facultyId) {
        return res.status(404).json({ message: "Faculty profile not found" });
      }

      const courseRows = await queryAsync(
        "SELECT course_id FROM course WHERE course_id = ? AND faculty_id = ?",
        [Number(course_id), facultyId]
      );
      if (!courseRows.length) {
        return res.status(403).json({ message: "You can only add results for your assigned courses" });
      }

      const studentIsAllowed = await isStudentAssignedToTeacherCourse(Number(student_id), Number(course_id), facultyId);
      if (!studentIsAllowed) {
        return res.status(400).json({ message: "Student is not assigned to this course or class" });
      }
    }

    const insertColumns = ["student_id", "course_id", schema.marksColumn, schema.totalColumn];
    const insertValues = [student_id, course_id, marks_obtained, total_marks];

    if (schema.examTypeColumn) {
      insertColumns.push(schema.examTypeColumn);
      insertValues.push(normalizedExamType);
    }

    const query = `
      INSERT INTO result (${insertColumns.join(", ")})
      VALUES (${insertColumns.map(() => "?").join(", ")})
    `;

    const result = await queryAsync(query, insertValues);
    await createAuditLog({
      action: "result.create",
      actor_user_id: req.user.user_id,
      target_type: "result",
      target_id: result.insertId,
      details: { student_id, course_id, marks_obtained, total_marks, exam_type: normalizedExamType },
      req
    });
    return res.status(201).json({
      message: "Result added successfully",
      result_id: result.insertId
    });
  } catch (err) {
    console.log("add result error", err);
    const msg = err.message || "Error adding result";
    return res.status(500).send(msg);
  }
});

app.put("/results/:id", verifyToken, checkRole(["admin", "teacher"]), async (req, res) => {
  const { id } = req.params;
  const { student_id, course_id, marks_obtained, total_marks, exam_type } = req.body;

  if (!student_id || !course_id || marks_obtained === undefined || marks_obtained === null || !total_marks) {
    return res.status(400).send("All result fields are required");
  }

  try {
    const schema = await getResultSchemaAsync();
    if (!schema.idColumn || !schema.marksColumn || !schema.totalColumn) {
      return res.status(500).send("Result table schema is not supported");
    }

    const normalizedExamType = String(exam_type || "semester").toLowerCase();
    if (!["midsem", "endsem", "semester"].includes(normalizedExamType)) {
      return res.status(400).json({ message: "exam_type must be midsem, endsem or semester" });
    }

    const existingRows = await queryAsync(
      `SELECT ${schema.idColumn} AS result_id, student_id, course_id FROM result WHERE ${schema.idColumn} = ?`,
      [id]
    );
    if (!existingRows.length) {
      return res.status(404).send("Result not found");
    }

    if (req.user.role === "teacher") {
      const facultyId = await getTeacherFacultyIdAsync(req.user.user_id);
      if (!facultyId) {
        return res.status(404).json({ message: "Faculty profile not found" });
      }

      const existingCourseRows = await queryAsync(
        "SELECT course_id FROM course WHERE course_id = ? AND faculty_id = ?",
        [Number(existingRows[0].course_id), facultyId]
      );
      if (!existingCourseRows.length) {
        return res.status(403).json({ message: "You can only edit results for your assigned courses" });
      }

      const targetCourseRows = await queryAsync(
        "SELECT course_id FROM course WHERE course_id = ? AND faculty_id = ?",
        [Number(course_id), facultyId]
      );
      if (!targetCourseRows.length) {
        return res.status(403).json({ message: "You can only assign results to your assigned courses" });
      }

      const studentIsAllowed = await isStudentAssignedToTeacherCourse(Number(student_id), Number(course_id), facultyId);
      if (!studentIsAllowed) {
        return res.status(400).json({ message: "Student is not assigned to this course or class" });
      }
    }

    const updateFields = [
      "student_id = ?",
      "course_id = ?",
      `${schema.marksColumn} = ?`,
      `${schema.totalColumn} = ?`
    ];
    const updateValues = [student_id, course_id, marks_obtained, total_marks];

    if (schema.examTypeColumn) {
      updateFields.push(`${schema.examTypeColumn} = ?`);
      updateValues.push(normalizedExamType);
    }

    const query = `
      UPDATE result
      SET ${updateFields.join(", ")}
      WHERE ${schema.idColumn} = ?
    `;

    const result = await queryAsync(query, [...updateValues, id]);
    if (result.affectedRows === 0) {
      return res.status(404).send("Result not found");
    }

    await createAuditLog({
      action: "result.update",
      actor_user_id: req.user.user_id,
      target_type: "result",
      target_id: id,
      details: { student_id, course_id, marks_obtained, total_marks, exam_type: normalizedExamType },
      req
    });

    return res.json({ message: "Result updated successfully" });
  } catch (err) {
    console.log("update result error", err);
    const msg = err.message || "Error updating result";
    return res.status(500).send(msg);
  }
});

app.delete("/results/:id", verifyToken, checkRole(["admin", "teacher"]), async (req, res) => {
  const { id } = req.params;

  try {
    const schema = await getResultSchemaAsync();
    if (!schema.idColumn) {
      return res.status(500).send("Result table schema is not supported");
    }

    const existingRows = await queryAsync(
      `SELECT ${schema.idColumn} AS result_id, course_id FROM result WHERE ${schema.idColumn} = ?`,
      [id]
    );
    if (!existingRows.length) {
      return res.status(404).send("Result not found");
    }

    if (req.user.role === "teacher") {
      const facultyId = await getTeacherFacultyIdAsync(req.user.user_id);
      if (!facultyId) {
        return res.status(404).json({ message: "Faculty profile not found" });
      }

      const courseRows = await queryAsync(
        "SELECT course_id FROM course WHERE course_id = ? AND faculty_id = ?",
        [Number(existingRows[0].course_id), facultyId]
      );
      if (!courseRows.length) {
        return res.status(403).json({ message: "You can only delete results for your assigned courses" });
      }
    }

    const query = `
      DELETE FROM result
      WHERE ${schema.idColumn} = ?
    `;

    const result = await queryAsync(query, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).send("Result not found");
    }

    await createAuditLog({
      action: "result.delete",
      actor_user_id: req.user.user_id,
      target_type: "result",
      target_id: id,
      details: {},
      req
    });

    return res.json({ message: "Result deleted successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).send("Error deleting result");
  }
});

// ===== STUDENT COURSE ENROLLMENT ENDPOINTS =====
app.get("/students/:id/courses", verifyToken, checkRole(["admin", "teacher", "student"]), async (req, res) => {
  const studentId = Number(req.params.id);
  if (!studentId || Number.isNaN(studentId)) {
    return res.status(400).json({ message: "Valid student ID is required" });
  }

  try {
    if (req.user.role === "student") {
      const ownRows = await queryAsync("SELECT student_id FROM student WHERE user_id = ?", [req.user.user_id]);
      const ownStudentId = ownRows[0]?.student_id;
      if (!ownStudentId) {
        return res.status(404).json({ message: "Student profile not found" });
      }
      if (ownStudentId !== studentId) {
        return res.status(403).json({ message: "You can only view your own course enrollments" });
      }
    }

    if (req.user.role === "teacher") {
      const facultyId = await getTeacherFacultyIdAsync(req.user.user_id);
      if (!facultyId) {
        return res.status(404).json({ message: "Faculty profile not found" });
      }

      const visibilityRows = await queryAsync(
        `
          SELECT s.student_id
          FROM student s
          WHERE s.student_id = ?
            AND (
              EXISTS (
                SELECT 1
                FROM student_course sc
                JOIN course c ON c.course_id = sc.course_id
                WHERE sc.student_id = s.student_id
                  AND c.faculty_id = ?
              )
              OR EXISTS (
                SELECT 1
                FROM class_student cs
                JOIN class_group cg ON cg.class_id = cs.class_id
                WHERE cs.student_id = s.student_id
                  AND cg.professor_id = ?
              )
            )
        `,
        [studentId, facultyId, facultyId]
      );

      if (!visibilityRows.length) {
        return res.status(403).json({ message: "You can only view enrollments for your assigned students" });
      }
    }

    const rows = await queryAsync(
      `
        SELECT c.*
        FROM course c
        INNER JOIN student_course sc ON c.course_id = sc.course_id
        WHERE sc.student_id = ?
      `,
      [studentId]
    );
    return res.json(rows);
  } catch (err) {
    console.log(err);
    return res.status(500).send("Error fetching student courses");
  }
});

app.post("/students/:id/courses", verifyToken, checkRole(["admin", "teacher"]), async (req, res) => {
  const studentId = Number(req.params.id);
  const courseId = Number(req.body.course_id);

  if (!studentId || Number.isNaN(studentId)) {
    return res.status(400).json({ message: "Valid student ID is required" });
  }
  if (!courseId || Number.isNaN(courseId)) {
    return res.status(400).json({ message: "Valid course ID is required" });
  }

  try {
    if (req.user.role === "teacher") {
      const facultyId = await getTeacherFacultyIdAsync(req.user.user_id);
      if (!facultyId) {
        return res.status(404).json({ message: "Faculty profile not found" });
      }

      const courseRows = await queryAsync(
        "SELECT course_id FROM course WHERE course_id = ? AND faculty_id = ?",
        [courseId, facultyId]
      );
      if (!courseRows.length) {
        return res.status(403).json({ message: "You can only enroll students in your assigned courses" });
      }
    }

    const result = await queryAsync(
      `
        INSERT INTO student_course (student_id, course_id)
        VALUES (?, ?)
      `,
      [studentId, courseId]
    );

    return res.status(201).json({
      message: "Student enrolled successfully",
      enrollment_id: result.insertId
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).send("Student is already enrolled in this course");
    }
    console.log("enroll course error", err);
    const msg = err.message || "Error enrolling in course";
    return res.status(500).send(msg);
  }
});

app.delete("/students/:id/courses/:course_id", verifyToken, checkRole(["admin", "teacher"]), async (req, res) => {
  const studentId = Number(req.params.id);
  const courseId = Number(req.params.course_id);

  if (!studentId || Number.isNaN(studentId) || !courseId || Number.isNaN(courseId)) {
    return res.status(400).json({ message: "Valid student and course IDs are required" });
  }

  try {
    if (req.user.role === "teacher") {
      const facultyId = await getTeacherFacultyIdAsync(req.user.user_id);
      if (!facultyId) {
        return res.status(404).json({ message: "Faculty profile not found" });
      }

      const courseRows = await queryAsync(
        "SELECT course_id FROM course WHERE course_id = ? AND faculty_id = ?",
        [courseId, facultyId]
      );
      if (!courseRows.length) {
        return res.status(403).json({ message: "You can only remove enrollments from your assigned courses" });
      }
    }

    const result = await queryAsync(
      `
        DELETE FROM student_course
        WHERE student_id = ? AND course_id = ?
      `,
      [studentId, courseId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).send("Enrollment record not found");
    }

    return res.json({ message: "Course enrollment removed successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).send("Error removing course enrollment");
  }
});

// ===== TIMETABLE ENDPOINTS =====
app.get("/timetable", verifyToken, checkRole(["admin", "teacher", "student"]), (req, res) => {
  const query = `
    SELECT
      t.timetable_id,
      t.day_of_week,
      t.start_time,
      t.end_time,
      t.room_number,
      t.session_type,
      c.course_id,
      c.course_name,
      c.department,
      f.faculty_id,
      f.name AS faculty_name
    FROM timetable_entry t
    JOIN course c ON t.course_id = c.course_id
    LEFT JOIN faculty f ON t.faculty_id = f.faculty_id
    ORDER BY FIELD(t.day_of_week, 'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'), t.start_time
  `;

  db.query(query, (err, rows) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: "Error fetching timetable" });
    }
    res.json(rows);
  });
});

app.post("/timetable", verifyToken, checkRole(["admin", "teacher"]), async (req, res) => {
  const { day_of_week, start_time, end_time, course_id, faculty_id, room_number, session_type } = req.body;

  if (!day_of_week || !start_time || !end_time || !course_id) {
    return res.status(400).json({ message: "Day, time range, and course are required" });
  }

  const courseId = Number(course_id);
  if (!courseId || Number.isNaN(courseId)) {
    return res.status(400).json({ message: "Valid course is required" });
  }

  try {
    let resolvedFacultyId = faculty_id ? Number(faculty_id) : null;

    if (req.user.role === "teacher") {
      const teacherFacultyId = await getTeacherFacultyIdAsync(req.user.user_id);
      if (!teacherFacultyId) {
        return res.status(404).json({ message: "Faculty profile not found" });
      }

      const courseRows = await queryAsync(
        "SELECT course_id FROM course WHERE course_id = ? AND faculty_id = ?",
        [courseId, teacherFacultyId]
      );
      if (!courseRows.length) {
        return res.status(403).json({ message: "You can only create timetable entries for your assigned courses" });
      }

      resolvedFacultyId = teacherFacultyId;
    }

    const result = await queryAsync(
      `
        INSERT INTO timetable_entry
          (day_of_week, start_time, end_time, course_id, faculty_id, room_number, session_type, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [day_of_week, start_time, end_time, courseId, resolvedFacultyId, room_number || "", session_type || "Lecture", req.user.user_id]
    );

    return res.status(201).json({ message: "Timetable entry added", timetable_id: result.insertId });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error adding timetable entry" });
  }
});

app.put("/timetable/:id", verifyToken, checkRole(["admin", "teacher"]), async (req, res) => {
  const timetableId = Number(req.params.id);
  const { day_of_week, start_time, end_time, course_id, faculty_id, room_number, session_type } = req.body;

  if (!timetableId || Number.isNaN(timetableId)) {
    return res.status(400).json({ message: "Valid timetable ID is required" });
  }
  if (!day_of_week || !start_time || !end_time || !course_id) {
    return res.status(400).json({ message: "Day, time range, and course are required" });
  }

  const courseId = Number(course_id);
  if (!courseId || Number.isNaN(courseId)) {
    return res.status(400).json({ message: "Valid course is required" });
  }

  try {
    let resolvedFacultyId = faculty_id ? Number(faculty_id) : null;

    if (req.user.role === "teacher") {
      const teacherFacultyId = await getTeacherFacultyIdAsync(req.user.user_id);
      if (!teacherFacultyId) {
        return res.status(404).json({ message: "Faculty profile not found" });
      }

      const existingRows = await queryAsync(
        `
          SELECT t.timetable_id
          FROM timetable_entry t
          JOIN course c ON c.course_id = t.course_id
          WHERE t.timetable_id = ? AND c.faculty_id = ?
        `,
        [timetableId, teacherFacultyId]
      );
      if (!existingRows.length) {
        return res.status(403).json({ message: "You can only update timetable entries for your assigned courses" });
      }

      const targetCourseRows = await queryAsync(
        "SELECT course_id FROM course WHERE course_id = ? AND faculty_id = ?",
        [courseId, teacherFacultyId]
      );
      if (!targetCourseRows.length) {
        return res.status(403).json({ message: "You can only assign timetable entries to your assigned courses" });
      }

      resolvedFacultyId = teacherFacultyId;
    }

    const result = await queryAsync(
      `
        UPDATE timetable_entry
        SET day_of_week = ?, start_time = ?, end_time = ?, course_id = ?, faculty_id = ?, room_number = ?, session_type = ?
        WHERE timetable_id = ?
      `,
      [day_of_week, start_time, end_time, courseId, resolvedFacultyId, room_number || "", session_type || "Lecture", timetableId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Timetable entry not found" });
    }

    return res.json({ message: "Timetable entry updated" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error updating timetable entry" });
  }
});

app.delete("/timetable/:id", verifyToken, checkRole(["admin"]), (req, res) => {
  db.query("DELETE FROM timetable_entry WHERE timetable_id = ?", [req.params.id], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: "Error deleting timetable entry" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Timetable entry not found" });
    }

    res.json({ message: "Timetable entry deleted" });
  });
});

// ===== FEES ENDPOINTS =====
app.get("/fees", verifyToken, checkRole(["admin", "teacher", "student"]), async (req, res) => {
  const baseQuery = `
    SELECT
      fr.fee_id,
      fr.student_id,
      s.name AS student_name,
      s.department,
      s.year,
      fr.semester,
      fr.fee_type,
      fr.amount_due,
      fr.amount_paid,
      fr.due_date,
      fr.status,
      fr.remarks,
      fr.updated_at,
      fr.created_at
    FROM fee_record fr
    JOIN student s ON fr.student_id = s.student_id
  `;

  try {
    if (req.user.role === "student") {
      const studentRows = await queryAsync("SELECT student_id FROM student WHERE user_id = ?", [req.user.user_id]);
      const studentId = studentRows[0]?.student_id;
      if (!studentId) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const rows = await queryAsync(`${baseQuery} WHERE fr.student_id = ? ORDER BY fr.created_at DESC`, [studentId]);
      return res.json(rows);
    }

    if (req.user.role === "teacher") {
      const facultyId = await getTeacherFacultyIdAsync(req.user.user_id);
      if (!facultyId) {
        return res.status(404).json({ message: "Faculty profile not found" });
      }

      const rows = await queryAsync(
        `
          ${baseQuery}
          WHERE EXISTS (
            SELECT 1
            FROM student_course sc
            JOIN course c ON c.course_id = sc.course_id
            WHERE sc.student_id = fr.student_id
              AND c.faculty_id = ?
          )
          OR EXISTS (
            SELECT 1
            FROM class_student cs
            JOIN class_group cg ON cg.class_id = cs.class_id
            WHERE cs.student_id = fr.student_id
              AND cg.professor_id = ?
          )
          ORDER BY fr.created_at DESC
        `,
        [facultyId, facultyId]
      );
      return res.json(rows);
    }

    const rows = await queryAsync(`${baseQuery} ORDER BY fr.created_at DESC`);
    return res.json(rows);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error fetching fee records" });
  }
});

app.post("/fees", verifyToken, checkRole(["admin"]), (req, res) => {
  const { student_id, semester, fee_type, amount_due, amount_paid, due_date, remarks } = req.body;

  if (!student_id || !semester || amount_due === undefined || amount_due === null) {
    return res.status(400).json({ message: "Student, semester, and amount due are required" });
  }

  const due = Number(amount_due);
  const paid = Number(amount_paid || 0);
  if (Number.isNaN(due) || Number.isNaN(paid)) {
    return res.status(400).json({ message: "Invalid amount values" });
  }

  const status = paid <= 0 ? "Pending" : paid >= due ? "Paid" : "Partially Paid";

  const query = `
    INSERT INTO fee_record (student_id, semester, fee_type, amount_due, amount_paid, due_date, status, remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [Number(student_id), semester, fee_type || "Tuition", due, paid, due_date || null, status, remarks || ""],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Error creating fee record" });
      }
      res.status(201).json({ message: "Fee record created", fee_id: result.insertId });
    }
  );
});

app.put("/fees/:id", verifyToken, checkRole(["admin"]), async (req, res) => {
  const { id } = req.params;
  const { semester, fee_type, amount_due, amount_paid, due_date, remarks, status } = req.body;

  if (!semester || amount_due === undefined || amount_due === null || amount_paid === undefined || amount_paid === null) {
    return res.status(400).json({ message: "Semester and amount fields are required" });
  }

  try {
    const result = await queryAsync(
      `
        UPDATE fee_record
        SET semester = ?, fee_type = ?, amount_due = ?, amount_paid = ?, due_date = ?, remarks = ?, status = ?
        WHERE fee_id = ?
      `,
      [semester, fee_type || "Tuition", Number(amount_due), Number(amount_paid), due_date || null, remarks || "", status || "Pending", id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Fee record not found" });
    }

    await createAuditLog({
      action: "fee.update",
      actor_user_id: req.user.user_id,
      target_type: "fee_record",
      target_id: id,
      details: { semester, fee_type, amount_due, amount_paid, due_date, remarks, status },
      req
    });

    return res.json({ message: "Fee record updated" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error updating fee record" });
  }
});

app.post("/fees/:id/pay", verifyToken, checkRole(["admin", "student"]), async (req, res) => {
  const { id } = req.params;
  const amount = Number(req.body.amount);

  if (Number.isNaN(amount) || amount <= 0) {
    return res.status(400).json({ message: "Valid payment amount is required" });
  }

  try {
    if (req.user.role === "student") {
      const rows = await queryAsync(
        `
          SELECT fr.fee_id
          FROM fee_record fr
          JOIN student s ON fr.student_id = s.student_id
          WHERE fr.fee_id = ? AND s.user_id = ?
        `,
        [id, req.user.user_id]
      );
      if (!rows.length) {
        return res.status(403).json({ message: "You can only pay your own fees" });
      }
    }

    const result = await queryAsync(
      `
        UPDATE fee_record
        SET
          amount_paid = LEAST(amount_due, amount_paid + ?),
          status = CASE
            WHEN (amount_paid + ?) >= amount_due THEN 'Paid'
            WHEN (amount_paid + ?) > 0 THEN 'Partially Paid'
            ELSE 'Pending'
          END
        WHERE fee_id = ?
      `,
      [amount, amount, amount, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Fee record not found" });
    }

    await createAuditLog({
      action: "fee.pay",
      actor_user_id: req.user.user_id,
      target_type: "fee_record",
      target_id: id,
      details: { amount },
      req
    });

    return res.json({ message: "Payment recorded successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error recording payment" });
  }
});

// ===== NOTIFICATIONS ENDPOINTS =====
app.get("/notifications", verifyToken, checkRole(["admin", "teacher", "student"]), (req, res) => {
  const query = `
    SELECT notification_id, user_id, title, message, category, is_read, created_at
    FROM notification
    WHERE user_id = ? OR user_id IS NULL
    ORDER BY is_read ASC, created_at DESC
  `;

  const fetchNotificationsForUser = () => {
    db.query(query, [req.user.user_id], (err, rows) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Error fetching notifications" });
      }
      return res.json(rows);
    });
  };

  if (req.user.role === "student") {
    return getStudentIdByUserId(req.user.user_id, async (studentErr, studentId) => {
      if (studentErr) {
        return fetchNotificationsForUser();
      }

      await syncStudentAutomatedNotifications(studentId, req.user.user_id);
      return fetchNotificationsForUser();
    });
  }

  return fetchNotificationsForUser();
});

app.post("/notifications", verifyToken, checkRole(["admin", "teacher"]), (req, res) => {
  const { title, message, category, target_user_id, target_role } = req.body;

  if (!title || !message) {
    return res.status(400).json({ message: "Title and message are required" });
  }

  const normalizedCategory = category || "General";

  if (target_user_id) {
    return db.query(
      "INSERT INTO notification (user_id, title, message, category, created_by) VALUES (?, ?, ?, ?, ?)",
      [Number(target_user_id), title, message, normalizedCategory, req.user.user_id],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ message: "Error creating notification" });
        }
        res.status(201).json({ message: "Notification sent", count: 1, notification_id: result.insertId });
      }
    );
  }

  let roleFilter = "";
  const values = [title, message, normalizedCategory, req.user.user_id];

  if (target_role && ["admin", "teacher", "student"].includes(target_role)) {
    roleFilter = "WHERE role = ?";
    values.push(target_role);
  }

  const query = `
    INSERT INTO notification (user_id, title, message, category, created_by)
    SELECT user_id, ?, ?, ?, ?
    FROM user
    ${roleFilter}
  `;

  db.query(query, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: "Error creating notifications" });
    }

    res.status(201).json({ message: "Notifications sent", count: result.affectedRows });
  });
});

app.put("/notifications/:id/read", verifyToken, checkRole(["admin", "teacher", "student"]), (req, res) => {
  const query = `
    UPDATE notification
    SET is_read = TRUE
    WHERE notification_id = ? AND (user_id = ? OR user_id IS NULL)
  `;

  db.query(query, [req.params.id, req.user.user_id], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: "Error updating notification" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification marked as read" });
  });
});

app.delete("/notifications/:id", verifyToken, checkRole(["admin"]), (req, res) => {
  db.query("DELETE FROM notification WHERE notification_id = ?", [req.params.id], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: "Error deleting notification" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification deleted" });
  });
});

// ===== ANNOUNCEMENT BOARD ENDPOINTS =====
app.get("/announcements", verifyToken, checkRole(["admin", "teacher", "student"]), (req, res) => {
  const baseQuery = `
    SELECT
      a.announcement_id,
      a.title,
      a.content,
      a.priority,
      a.expires_at,
      a.is_active,
      a.posted_by,
      a.target_roles,
      a.target_course_id,
      a.target_class_id,
      a.target_semester,
      a.target_section,
      a.created_at,
      a.updated_at,
      u.email AS author_email
    FROM announcement a
    LEFT JOIN user u ON u.user_id = a.posted_by
  `;

  const runForUser = async () => {
    try {
      if (req.user.role === "admin") {
        const rows = await queryAsync(
          `${baseQuery} ORDER BY FIELD(a.priority, 'Critical', 'High', 'Normal', 'Low'), a.created_at DESC`
        );
        return res.json(rows);
      }

      let studentCtx = { semester: null, section: null, student_id: null, faculty_id: null };
      if (req.user.role === "student") {
        const rows = await queryAsync(
          "SELECT student_id, semester, section FROM student WHERE user_id = ?",
          [req.user.user_id]
        );
        studentCtx = rows[0] || studentCtx;
      }

      if (req.user.role === "teacher") {
        const rows = await queryAsync("SELECT faculty_id FROM faculty WHERE user_id = ?", [req.user.user_id]);
        studentCtx.faculty_id = rows[0]?.faculty_id || null;
      }

      const rows = await queryAsync(
        `${baseQuery}
         WHERE a.is_active = TRUE
           AND (a.expires_at IS NULL OR a.expires_at >= CURDATE())
           AND (a.target_roles IS NULL OR a.target_roles = '' OR FIND_IN_SET(?, a.target_roles) > 0)
           AND (
             a.target_semester IS NULL
             OR a.target_semester = ''
             OR a.target_semester = ?
           )
           AND (
             a.target_section IS NULL
             OR a.target_section = ''
             OR a.target_section = ?
           )
           AND (
             a.target_course_id IS NULL
             OR (
               ? = 'student' AND EXISTS (
                 SELECT 1 FROM student_course sc
                 WHERE sc.student_id = ? AND sc.course_id = a.target_course_id
               )
             )
             OR (
               ? = 'teacher' AND EXISTS (
                 SELECT 1 FROM course c
                 WHERE c.course_id = a.target_course_id AND c.faculty_id = ?
               )
             )
           )
           AND (
             a.target_class_id IS NULL
             OR (
               ? = 'student' AND EXISTS (
                 SELECT 1 FROM class_student cs
                 WHERE cs.student_id = ? AND cs.class_id = a.target_class_id
               )
             )
             OR (
               ? = 'teacher' AND EXISTS (
                 SELECT 1 FROM class_group cg
                 WHERE cg.class_id = a.target_class_id AND cg.professor_id = ?
               )
             )
           )
         ORDER BY FIELD(a.priority, 'Critical', 'High', 'Normal', 'Low'), a.created_at DESC`,
        [
          req.user.role,
          studentCtx.semester,
          studentCtx.section,
          req.user.role,
          studentCtx.student_id,
          req.user.role,
          studentCtx.faculty_id,
          req.user.role,
          studentCtx.student_id,
          req.user.role,
          studentCtx.faculty_id
        ]
      );

      return res.json(rows);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: "Error fetching announcements" });
    }
  };

  runForUser();
});

app.post("/announcements", verifyToken, checkRole(["admin", "teacher"]), async (req, res) => {
  const {
    title,
    content,
    priority,
    expires_at,
    is_active,
    target_roles,
    target_course_id,
    target_class_id,
    target_semester,
    target_section
  } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: "Title and content are required" });
  }

  try {
    const normalizedTargetCourseId = target_course_id ? Number(target_course_id) : null;
    const normalizedTargetClassId = target_class_id ? Number(target_class_id) : null;

    if (req.user.role === "teacher") {
      const facultyId = await getTeacherFacultyIdAsync(req.user.user_id);
      if (!facultyId) {
        return res.status(404).json({ message: "Faculty profile not found" });
      }

      if (normalizedTargetCourseId) {
        const courseRows = await queryAsync("SELECT course_id FROM course WHERE course_id = ? AND faculty_id = ?", [normalizedTargetCourseId, facultyId]);
        if (!courseRows.length) {
          return res.status(403).json({ message: "You can only target announcements to your assigned courses" });
        }
      }

      if (normalizedTargetClassId) {
        const classRows = await queryAsync("SELECT class_id FROM class_group WHERE class_id = ? AND professor_id = ?", [normalizedTargetClassId, facultyId]);
        if (!classRows.length) {
          return res.status(403).json({ message: "You can only target announcements to your own classes" });
        }
      }
    }

    const rolesCsv = normalizeList(target_roles).join(",");
    const result = await queryAsync(
      `
        INSERT INTO announcement
          (title, content, priority, expires_at, is_active, posted_by, target_roles, target_course_id, target_class_id, target_semester, target_section)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        title,
        content,
        priority || "Normal",
        expires_at || null,
        is_active === undefined ? true : !!is_active,
        req.user.user_id,
        rolesCsv || null,
        normalizedTargetCourseId,
        normalizedTargetClassId,
        target_semester || null,
        target_section || null
      ]
    );

    return res.status(201).json({ message: "Announcement posted", announcement_id: result.insertId });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error posting announcement" });
  }
});

app.put("/announcements/:id", verifyToken, checkRole(["admin", "teacher"]), async (req, res) => {
  const {
    title,
    content,
    priority,
    expires_at,
    is_active,
    target_roles,
    target_course_id,
    target_class_id,
    target_semester,
    target_section
  } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: "Title and content are required" });
  }

  try {
    const announcementId = Number(req.params.id);
    if (!announcementId || Number.isNaN(announcementId)) {
      return res.status(400).json({ message: "Valid announcement ID is required" });
    }

    if (req.user.role === "teacher") {
      const ownerRows = await queryAsync(
        "SELECT announcement_id FROM announcement WHERE announcement_id = ? AND posted_by = ?",
        [announcementId, req.user.user_id]
      );
      if (!ownerRows.length) {
        return res.status(403).json({ message: "You can only update announcements you posted" });
      }
    }

    const query = `
      UPDATE announcement
      SET
        title = ?,
        content = ?,
        priority = ?,
        expires_at = ?,
        is_active = ?,
        target_roles = ?,
        target_course_id = ?,
        target_class_id = ?,
        target_semester = ?,
        target_section = ?
      WHERE announcement_id = ?
    `;

    const rolesCsv = normalizeList(target_roles).join(",");
    const result = await queryAsync(
      query,
      [
        title,
        content,
        priority || "Normal",
        expires_at || null,
        is_active === undefined ? true : !!is_active,
        rolesCsv || null,
        target_course_id ? Number(target_course_id) : null,
        target_class_id ? Number(target_class_id) : null,
        target_semester || null,
        target_section || null,
        announcementId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    return res.json({ message: "Announcement updated" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error updating announcement" });
  }
});

app.delete("/announcements/:id", verifyToken, checkRole(["admin", "teacher"]), async (req, res) => {
  try {
    const announcementId = Number(req.params.id);
    if (!announcementId || Number.isNaN(announcementId)) {
      return res.status(400).json({ message: "Valid announcement ID is required" });
    }

    if (req.user.role === "teacher") {
      const ownerRows = await queryAsync(
        "SELECT announcement_id FROM announcement WHERE announcement_id = ? AND posted_by = ?",
        [announcementId, req.user.user_id]
      );
      if (!ownerRows.length) {
        return res.status(403).json({ message: "You can only delete announcements you posted" });
      }
    }

    const result = await queryAsync("DELETE FROM announcement WHERE announcement_id = ?", [announcementId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    return res.json({ message: "Announcement deleted" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error deleting announcement" });
  }
});

// ===== COURSE REGISTRATION ENDPOINTS =====
app.get("/course-registration", verifyToken, checkRole(["admin", "teacher", "student"]), async (req, res) => {
  // Backlog/course registration feature is intentionally disabled.
  return res.status(410).json({ message: "Course registration feature is disabled" });
});

app.get("/course-registration/available", verifyToken, checkRole(["student"]), (req, res) => {
  // Backlog/course registration feature is intentionally disabled.
  return res.status(410).json({ message: "Course registration feature is disabled" });
});

app.post("/course-registration", verifyToken, checkRole(["student"]), (req, res) => {
  // Backlog/course registration feature is intentionally disabled.
  return res.status(410).json({ message: "Course registration feature is disabled" });
});

app.put("/course-registration/:id/review", verifyToken, checkRole(["admin", "teacher"]), async (req, res) => {
  // Backlog/course registration feature is intentionally disabled.
  return res.status(410).json({ message: "Course registration feature is disabled" });
});

// ===== CLASS MANAGEMENT ENDPOINTS =====
app.get("/classes", verifyToken, checkRole(["admin", "teacher", "student"]), async (req, res) => {
  try {
    const base = `
      SELECT
        cg.class_id,
        cg.class_name,
        cg.course_id,
        c.course_name,
        c.course_code,
        cg.professor_id,
        f.name AS professor_name,
        cg.semester,
        cg.section,
        cg.term_start_date,
        cg.term_end_date,
        cg.weekdays,
        cg.start_time,
        cg.end_time,
        cg.room,
        cg.created_at,
        cg.updated_at,
        (
          SELECT COUNT(*) FROM class_student cs WHERE cs.class_id = cg.class_id
        ) AS total_students
      FROM class_group cg
      JOIN course c ON c.course_id = cg.course_id
      LEFT JOIN faculty f ON f.faculty_id = cg.professor_id
    `;

    if (req.user.role === "admin") {
      const rows = await queryAsync(`${base} ORDER BY cg.created_at DESC`);
      return res.json(rows);
    }

    if (req.user.role === "teacher") {
      const facultyRows = await queryAsync("SELECT faculty_id FROM faculty WHERE user_id = ?", [req.user.user_id]);
      const facultyId = facultyRows[0]?.faculty_id;
      if (!facultyId) {
        return res.status(404).json({ message: "Faculty profile not found" });
      }

      const rows = await queryAsync(`${base} WHERE cg.professor_id = ? ORDER BY cg.created_at DESC`, [facultyId]);
      return res.json(rows);
    }

    const studentRows = await queryAsync("SELECT student_id FROM student WHERE user_id = ?", [req.user.user_id]);
    const studentId = studentRows[0]?.student_id;
    if (!studentId) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const rows = await queryAsync(
      `${base}
       JOIN class_student cs ON cs.class_id = cg.class_id
       WHERE cs.student_id = ?
       ORDER BY cg.created_at DESC`,
      [studentId]
    );

    return res.json(rows);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error fetching classes" });
  }
});

app.get("/classes/:id/students", verifyToken, checkRole(["admin", "teacher", "student"]), async (req, res) => {
  try {
    const classId = Number(req.params.id);
    if (!classId || Number.isNaN(classId)) {
      return res.status(400).json({ message: "Valid class ID is required" });
    }

    if (req.user.role === "teacher") {
      const facultyRows = await queryAsync("SELECT faculty_id FROM faculty WHERE user_id = ?", [req.user.user_id]);
      const facultyId = facultyRows[0]?.faculty_id;
      if (!facultyId) {
        return res.status(404).json({ message: "Faculty profile not found" });
      }

      const ownershipRows = await queryAsync(
        "SELECT class_id FROM class_group WHERE class_id = ? AND professor_id = ?",
        [classId, facultyId]
      );
      if (!ownershipRows.length) {
        return res.status(403).json({ message: "You can only view students from your own classes" });
      }
    }

    if (req.user.role === "student") {
      const studentRows = await queryAsync("SELECT student_id FROM student WHERE user_id = ?", [req.user.user_id]);
      const studentId = studentRows[0]?.student_id;
      if (!studentId) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const enrollmentRows = await queryAsync(
        "SELECT id FROM class_student WHERE class_id = ? AND student_id = ?",
        [classId, studentId]
      );
      if (!enrollmentRows.length) {
        return res.status(403).json({ message: "You can only view students from your own classes" });
      }
    }

    const includeEmail = req.user.role !== "student";
    const rows = await queryAsync(
      `
        SELECT
          s.student_id,
          s.name,
          s.department,
          s.semester,
          s.section,
          COALESCE(s.academic_id, s.roll_number, u.username, SUBSTRING_INDEX(u.email, '@', 1)) AS academic_id
          ${includeEmail ? ", u.email" : ""}
        FROM class_student cs
        JOIN student s ON s.student_id = cs.student_id
        JOIN user u ON u.user_id = s.user_id
        WHERE cs.class_id = ?
        ORDER BY academic_id ASC, s.name ASC
      `,
      [classId]
    );
    return res.json(rows);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error fetching class students" });
  }
});

app.post("/classes", verifyToken, checkRole(["admin", "teacher"]), async (req, res) => {
  const {
    class_name,
    course_id,
    professor_id,
    semester,
    section,
    term_start_date,
    term_end_date,
    weekdays,
    start_time,
    end_time,
    room,
    student_ids
  } = req.body;

  if (!class_name || !course_id) {
    return res.status(400).json({ message: "Class name and course are required" });
  }

  try {
    const normalizedCourseId = Number(course_id);
    if (!normalizedCourseId || Number.isNaN(normalizedCourseId)) {
      return res.status(400).json({ message: "Valid course is required" });
    }

    let resolvedProfessorId = professor_id ? Number(professor_id) : null;
    if (req.user.role === "teacher") {
      const teacherRows = await queryAsync("SELECT faculty_id FROM faculty WHERE user_id = ?", [req.user.user_id]);
      resolvedProfessorId = teacherRows[0]?.faculty_id || null;
      if (!resolvedProfessorId) {
        return res.status(404).json({ message: "Faculty profile not found" });
      }

      const ownershipRows = await queryAsync(
        "SELECT course_id FROM course WHERE course_id = ? AND faculty_id = ?",
        [normalizedCourseId, resolvedProfessorId]
      );
      if (!ownershipRows.length) {
        return res.status(403).json({ message: "You can only create classes for your own subjects" });
      }
    }

    const insert = await queryAsync(
      `
        INSERT INTO class_group
          (class_name, course_id, professor_id, semester, section, term_start_date, term_end_date, weekdays, start_time, end_time, room, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        class_name,
        normalizedCourseId,
        resolvedProfessorId,
        semester || null,
        section || null,
        term_start_date || null,
        term_end_date || null,
        Array.isArray(weekdays) ? weekdays.join(",") : weekdays || null,
        start_time || null,
        end_time || null,
        room || null,
        req.user.user_id
      ]
    );

    const classId = insert.insertId;
    if (Array.isArray(student_ids) && student_ids.length) {
      const selectedIds = student_ids.map((id) => Number(id)).filter(Boolean);
      if (selectedIds.length) {
        const enrolledRows = await queryAsync(
          `
            SELECT DISTINCT student_id
            FROM student_course
            WHERE course_id = ? AND student_id IN (${selectedIds.map(() => "?").join(",")})
          `,
          [normalizedCourseId, ...selectedIds]
        );

        const enrolledIds = enrolledRows.map((row) => Number(row.student_id));
        if (enrolledIds.length) {
          const values = enrolledIds.map((studentId) => [classId, studentId]);
          await queryAsync("INSERT IGNORE INTO class_student (class_id, student_id) VALUES ?", [values]);
        }
      }
    }

    return res.status(201).json({ message: "Class created", class_id: classId });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error creating class" });
  }
});

app.put("/classes/:id", verifyToken, checkRole(["admin", "teacher"]), async (req, res) => {
  const { id } = req.params;
  const {
    class_name,
    course_id,
    professor_id,
    semester,
    section,
    term_start_date,
    term_end_date,
    weekdays,
    start_time,
    end_time,
    room
  } = req.body;

  if (!class_name || !course_id) {
    return res.status(400).json({ message: "Class name and course are required" });
  }

  try {
    const normalizedCourseId = Number(course_id);
    if (!normalizedCourseId || Number.isNaN(normalizedCourseId)) {
      return res.status(400).json({ message: "Valid course is required" });
    }

    let resolvedProfessorId = professor_id ? Number(professor_id) : null;
    if (req.user.role === "teacher") {
      const teacherRows = await queryAsync("SELECT faculty_id FROM faculty WHERE user_id = ?", [req.user.user_id]);
      resolvedProfessorId = teacherRows[0]?.faculty_id || null;
      if (!resolvedProfessorId) {
        return res.status(404).json({ message: "Faculty profile not found" });
      }

      const ownershipRows = await queryAsync(
        "SELECT class_id FROM class_group WHERE class_id = ? AND professor_id = ?",
        [Number(id), resolvedProfessorId]
      );
      if (!ownershipRows.length) {
        return res.status(403).json({ message: "You can only update your own classes" });
      }

      const courseRows = await queryAsync(
        "SELECT course_id FROM course WHERE course_id = ? AND faculty_id = ?",
        [normalizedCourseId, resolvedProfessorId]
      );
      if (!courseRows.length) {
        return res.status(403).json({ message: "You can only assign classes to your own subjects" });
      }
    }

    const result = await queryAsync(
      `
        UPDATE class_group
        SET
          class_name = ?,
          course_id = ?,
          professor_id = ?,
          semester = ?,
          section = ?,
          term_start_date = ?,
          term_end_date = ?,
          weekdays = ?,
          start_time = ?,
          end_time = ?,
          room = ?
        WHERE class_id = ?
      `,
      [
        class_name,
        normalizedCourseId,
        resolvedProfessorId,
        semester || null,
        section || null,
        term_start_date || null,
        term_end_date || null,
        Array.isArray(weekdays) ? weekdays.join(",") : weekdays || null,
        start_time || null,
        end_time || null,
        room || null,
        Number(id)
      ]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Class not found" });
    }

    return res.json({ message: "Class updated" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error updating class" });
  }
});

app.delete("/classes/:id", verifyToken, checkRole(["admin", "teacher"]), async (req, res) => {
  try {
    const classId = Number(req.params.id);

    if (req.user.role === "teacher") {
      const facultyRows = await queryAsync("SELECT faculty_id FROM faculty WHERE user_id = ?", [req.user.user_id]);
      const facultyId = facultyRows[0]?.faculty_id;
      const ownership = await queryAsync("SELECT class_id FROM class_group WHERE class_id = ? AND professor_id = ?", [classId, facultyId]);
      if (!ownership.length) {
        return res.status(403).json({ message: "You can only delete your own classes" });
      }
    }

    const result = await queryAsync("DELETE FROM class_group WHERE class_id = ?", [classId]);
    if (!result.affectedRows) {
      return res.status(404).json({ message: "Class not found" });
    }

    return res.json({ message: "Class deleted" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error deleting class" });
  }
});

app.post("/classes/:id/students", verifyToken, checkRole(["admin", "teacher"]), async (req, res) => {
  const classId = Number(req.params.id);
  const { student_ids, semester, section } = req.body;

  try {
    if (!classId || Number.isNaN(classId)) {
      return res.status(400).json({ message: "Valid class ID is required" });
    }

    if (req.user.role === "teacher") {
      const facultyRows = await queryAsync("SELECT faculty_id FROM faculty WHERE user_id = ?", [req.user.user_id]);
      const facultyId = facultyRows[0]?.faculty_id;
      if (!facultyId) {
        return res.status(404).json({ message: "Faculty profile not found" });
      }

      const ownershipRows = await queryAsync(
        "SELECT class_id FROM class_group WHERE class_id = ? AND professor_id = ?",
        [classId, facultyId]
      );
      if (!ownershipRows.length) {
        return res.status(403).json({ message: "You can only assign students to your own classes" });
      }
    }

    const classRows = await queryAsync("SELECT class_id, course_id FROM class_group WHERE class_id = ?", [classId]);
    if (!classRows.length) {
      return res.status(404).json({ message: "Class not found" });
    }
    const classCourseId = Number(classRows[0].course_id);

    let selectedIds = Array.isArray(student_ids) ? student_ids.map((id) => Number(id)).filter(Boolean) : [];

    if (!selectedIds.length && (semester || section)) {
      const filters = [];
      const params = [];
      if (semester) {
        filters.push("semester = ?");
        params.push(String(semester));
      }
      if (section) {
        filters.push("section = ?");
        params.push(String(section));
      }

      const rows = await queryAsync(`SELECT student_id FROM student ${filters.length ? `WHERE ${filters.join(" AND ")}` : ""}`, params);
      selectedIds = rows.map((row) => row.student_id);
    }

    if (!selectedIds.length) {
      return res.status(400).json({ message: "Provide student IDs or valid semester/section filters" });
    }

    const enrolledRows = await queryAsync(
      `
        SELECT DISTINCT student_id
        FROM student_course
        WHERE course_id = ? AND student_id IN (${selectedIds.map(() => "?").join(",")})
      `,
      [classCourseId, ...selectedIds]
    );
    selectedIds = enrolledRows.map((row) => Number(row.student_id));

    if (!selectedIds.length) {
      return res.status(400).json({ message: "No eligible students found. Students must be enrolled in the class course." });
    }

    const values = selectedIds.map((studentId) => [classId, studentId]);
    await queryAsync("INSERT IGNORE INTO class_student (class_id, student_id) VALUES ?", [values]);

    return res.json({ message: "Students assigned to class", count: selectedIds.length });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error assigning students" });
  }
});

// ===== CLASS ATTENDANCE ENDPOINTS =====
app.post("/attendance/self-mark", verifyToken, checkRole(["student"]), async (req, res) => {
  const { class_id, session_date, status } = req.body;
  if (!class_id || !session_date) {
    return res.status(400).json({ message: "Class and session date are required" });
  }

  try {
    const studentRows = await queryAsync("SELECT student_id FROM student WHERE user_id = ?", [req.user.user_id]);
    const studentId = studentRows[0]?.student_id;
    if (!studentId) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const enrolled = await queryAsync("SELECT id FROM class_student WHERE class_id = ? AND student_id = ?", [Number(class_id), studentId]);
    if (!enrolled.length) {
      return res.status(403).json({ message: "You are not assigned to this class" });
    }

    await queryAsync(
      `
        INSERT INTO class_attendance (class_id, student_id, session_date, status, marked_by)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE status = VALUES(status), marked_by = VALUES(marked_by)
      `,
      [Number(class_id), studentId, session_date, normalizeStatus(status), req.user.user_id]
    );

    return res.json({ message: "Attendance marked successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Could not mark attendance" });
  }
});

const upsertClassAttendance = async (req, res) => {
  const classId = Number(req.params.id);
  const { session_date, records } = req.body;

  if (!session_date || !Array.isArray(records) || !records.length) {
    return res.status(400).json({ message: "Session date and attendance records are required" });
  }

  try {
    if (req.user.role === "teacher") {
      const facultyRows = await queryAsync("SELECT faculty_id FROM faculty WHERE user_id = ?", [req.user.user_id]);
      const facultyId = facultyRows[0]?.faculty_id;
      const classRows = await queryAsync("SELECT class_id FROM class_group WHERE class_id = ? AND professor_id = ?", [classId, facultyId]);
      if (!classRows.length) {
        return res.status(403).json({ message: "You can only mark attendance for your own classes" });
      }
    }

    for (const record of records) {
      if (!record.student_id) continue;
      await queryAsync(
        `
          INSERT INTO class_attendance (class_id, student_id, session_date, status, marked_by)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE status = VALUES(status), marked_by = VALUES(marked_by)
        `,
        [classId, Number(record.student_id), session_date, normalizeStatus(record.status), req.user.user_id]
      );
    }

    return res.json({ message: "Attendance saved" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error saving attendance" });
  }
};

app.post("/classes/:id/attendance", verifyToken, checkRole(["admin", "teacher"]), upsertClassAttendance);
app.put("/classes/:id/attendance", verifyToken, checkRole(["admin", "teacher"]), upsertClassAttendance);

app.get("/attendance/my", verifyToken, checkRole(["student"]), async (req, res) => {
  try {
    const studentRows = await queryAsync("SELECT student_id FROM student WHERE user_id = ?", [req.user.user_id]);
    const studentId = studentRows[0]?.student_id;
    if (!studentId) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const rows = await queryAsync(
      `
        SELECT
          ca.class_attendance_id,
          ca.class_id,
          cg.class_name,
          c.course_name,
          ca.session_date,
          ca.status,
          ca.updated_at
        FROM class_attendance ca
        JOIN class_group cg ON cg.class_id = ca.class_id
        JOIN course c ON c.course_id = cg.course_id
        WHERE ca.student_id = ?
        ORDER BY ca.session_date DESC
      `,
      [studentId]
    );
    return res.json(rows);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error fetching attendance" });
  }
});

app.get("/attendance/stats", verifyToken, checkRole(["admin", "teacher", "student"]), async (req, res) => {
  try {
    if (req.user.role === "student") {
      const studentRows = await queryAsync("SELECT student_id FROM student WHERE user_id = ?", [req.user.user_id]);
      const studentId = studentRows[0]?.student_id;
      const rows = await queryAsync(
        `
          SELECT
            COUNT(*) AS total_sessions,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present_count,
            SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent_count,
            ROUND((SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0), 2) AS percentage
          FROM class_attendance
          WHERE student_id = ?
        `,
        [studentId]
      );
      return res.json(rows[0] || {});
    }

    const rows = await queryAsync(
      `
        SELECT
          COUNT(*) AS total_records,
          COUNT(DISTINCT class_id) AS total_classes,
          COUNT(DISTINCT session_date) AS total_sessions,
          ROUND((SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0), 2) AS average_attendance
        FROM class_attendance
      `
    );
    return res.json(rows[0] || {});
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error fetching attendance stats" });
  }
});

app.get("/attendance/by-date", verifyToken, checkRole(["admin", "teacher", "student"]), async (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ message: "Date is required" });
  }

  try {
    let rows = [];

    if (req.user.role === "student") {
      const studentRows = await queryAsync("SELECT student_id FROM student WHERE user_id = ?", [req.user.user_id]);
      const studentId = studentRows[0]?.student_id;
      if (!studentId) {
        return res.status(404).json({ message: "Student profile not found" });
      }
      rows = await queryAsync(
        `
          SELECT
            ca.class_attendance_id,
            ca.class_id,
            cg.class_name,
            ca.student_id,
            s.name AS student_name,
            ca.session_date,
            ca.status
          FROM class_attendance ca
          JOIN class_group cg ON cg.class_id = ca.class_id
          JOIN student s ON s.student_id = ca.student_id
          WHERE ca.session_date = ? AND ca.student_id = ?
          ORDER BY cg.class_name, s.name
        `,
        [date, studentId]
      );
      return res.json(rows);
    }

    if (req.user.role === "teacher") {
      const facultyId = await getTeacherFacultyIdAsync(req.user.user_id);
      if (!facultyId) {
        return res.status(404).json({ message: "Faculty profile not found" });
      }
      rows = await queryAsync(
        `
          SELECT
            ca.class_attendance_id,
            ca.class_id,
            cg.class_name,
            ca.student_id,
            s.name AS student_name,
            ca.session_date,
            ca.status
          FROM class_attendance ca
          JOIN class_group cg ON cg.class_id = ca.class_id
          JOIN student s ON s.student_id = ca.student_id
          WHERE ca.session_date = ? AND cg.professor_id = ?
          ORDER BY cg.class_name, s.name
        `,
        [date, facultyId]
      );
      return res.json(rows);
    }

    rows = await queryAsync(
      `
        SELECT
          ca.class_attendance_id,
          ca.class_id,
          cg.class_name,
          ca.student_id,
          s.name AS student_name,
          ca.session_date,
          ca.status
        FROM class_attendance ca
        JOIN class_group cg ON cg.class_id = ca.class_id
        JOIN student s ON s.student_id = ca.student_id
        WHERE ca.session_date = ?
        ORDER BY cg.class_name, s.name
      `,
      [date]
    );
    return res.json(rows);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error fetching attendance by date" });
  }
});

app.get("/attendance/sessions", verifyToken, checkRole(["admin", "teacher"]), async (req, res) => {
  try {
    let whereClause = "";
    const params = [];

    if (req.user.role === "teacher") {
      const rows = await queryAsync("SELECT faculty_id FROM faculty WHERE user_id = ?", [req.user.user_id]);
      const facultyId = rows[0]?.faculty_id;
      whereClause = "WHERE cg.professor_id = ?";
      params.push(facultyId || 0);
    }

    const rows = await queryAsync(
      `
        SELECT
          ca.class_id,
          cg.class_name,
          c.course_name,
          ca.session_date,
          SUM(CASE WHEN ca.status = 'present' THEN 1 ELSE 0 END) AS present_count,
          SUM(CASE WHEN ca.status = 'absent' THEN 1 ELSE 0 END) AS absent_count,
          COUNT(*) AS total_students
        FROM class_attendance ca
        JOIN class_group cg ON cg.class_id = ca.class_id
        JOIN course c ON c.course_id = cg.course_id
        ${whereClause}
        GROUP BY ca.class_id, ca.session_date
        ORDER BY ca.session_date DESC
      `,
      params
    );
    return res.json(rows);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error fetching attendance sessions" });
  }
});

app.get("/attendance/student/:studentId/report", verifyToken, checkRole(["admin", "teacher", "student"]), async (req, res) => {
  try {
    let studentId = Number(req.params.studentId);
    if (req.user.role === "student") {
      const rows = await queryAsync("SELECT student_id FROM student WHERE user_id = ?", [req.user.user_id]);
      studentId = rows[0]?.student_id;
    }

    const rows = await queryAsync(
      `
        SELECT
          cg.class_id,
          cg.class_name,
          c.course_name,
          COUNT(*) AS total_sessions,
          SUM(CASE WHEN ca.status = 'present' THEN 1 ELSE 0 END) AS present_count,
          SUM(CASE WHEN ca.status = 'absent' THEN 1 ELSE 0 END) AS absent_count,
          ROUND((SUM(CASE WHEN ca.status = 'present' THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0), 2) AS percentage
        FROM class_attendance ca
        JOIN class_group cg ON cg.class_id = ca.class_id
        JOIN course c ON c.course_id = cg.course_id
        WHERE ca.student_id = ?
        GROUP BY cg.class_id
        ORDER BY c.course_name
      `,
      [studentId]
    );
    return res.json(rows);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error generating student report" });
  }
});

app.get("/attendance/class/:classId/report", verifyToken, checkRole(["admin", "teacher"]), async (req, res) => {
  try {
    const classId = Number(req.params.classId);
    if (!classId || Number.isNaN(classId)) {
      return res.status(400).json({ message: "Valid class ID is required" });
    }

    if (req.user.role === "teacher") {
      const facultyId = await getTeacherFacultyIdAsync(req.user.user_id);
      if (!facultyId) {
        return res.status(404).json({ message: "Faculty profile not found" });
      }
      const ownership = await queryAsync("SELECT class_id FROM class_group WHERE class_id = ? AND professor_id = ?", [classId, facultyId]);
      if (!ownership.length) {
        return res.status(403).json({ message: "You can only view reports for your own classes" });
      }
    }

    const rows = await queryAsync(
      `
        SELECT
          ca.student_id,
          s.name AS student_name,
          COALESCE(s.academic_id, s.roll_number, SUBSTRING_INDEX(u.email, '@', 1)) AS academic_id,
          COUNT(*) AS total_sessions,
          SUM(CASE WHEN ca.status = 'present' THEN 1 ELSE 0 END) AS present_count,
          SUM(CASE WHEN ca.status = 'absent' THEN 1 ELSE 0 END) AS absent_count,
          ROUND((SUM(CASE WHEN ca.status = 'present' THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0), 2) AS percentage
        FROM class_attendance ca
        JOIN student s ON s.student_id = ca.student_id
        JOIN user u ON u.user_id = s.user_id
        WHERE ca.class_id = ?
        GROUP BY ca.student_id
        ORDER BY academic_id, s.name
      `,
      [classId]
    );

    const summaryRows = await queryAsync(
      `
        SELECT
          COUNT(*) AS total_records,
          COUNT(DISTINCT session_date) AS sessions_count,
          COUNT(DISTINCT student_id) AS students_count,
          ROUND((SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0), 2) AS average_attendance
        FROM class_attendance
        WHERE class_id = ?
      `,
      [classId]
    );

    return res.json({ students: rows, summary: summaryRows[0] || {} });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error generating class report" });
  }
});

app.get("/attendance/class/:classId/session/:date", verifyToken, checkRole(["admin", "teacher"]), async (req, res) => {
  try {
    const classId = Number(req.params.classId);
    const date = req.params.date;
    if (!classId || Number.isNaN(classId)) {
      return res.status(400).json({ message: "Valid class ID is required" });
    }

    if (req.user.role === "teacher") {
      const facultyId = await getTeacherFacultyIdAsync(req.user.user_id);
      if (!facultyId) {
        return res.status(404).json({ message: "Faculty profile not found" });
      }
      const ownership = await queryAsync("SELECT class_id FROM class_group WHERE class_id = ? AND professor_id = ?", [classId, facultyId]);
      if (!ownership.length) {
        return res.status(403).json({ message: "You can only view sessions for your own classes" });
      }
    }

    const rows = await queryAsync(
      `
        SELECT
          ca.student_id,
          s.name AS student_name,
          COALESCE(s.academic_id, s.roll_number, SUBSTRING_INDEX(u.email, '@', 1)) AS academic_id,
          ca.status
        FROM class_attendance ca
        JOIN student s ON s.student_id = ca.student_id
        JOIN user u ON u.user_id = s.user_id
        WHERE ca.class_id = ? AND ca.session_date = ?
        ORDER BY academic_id, s.name
      `,
      [classId, date]
    );

    const summary = {
      present_count: rows.filter((item) => item.status === "present").length,
      absent_count: rows.filter((item) => item.status === "absent").length,
      total_students: rows.length
    };

    return res.json({ summary, students: rows });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error fetching class session details" });
  }
});

// ===== ACADEMIC CONFIGURATION ENDPOINTS =====
app.get("/academic-config", verifyToken, checkRole(["admin", "teacher", "student"]), async (req, res) => {
  try {
    const rows = await queryAsync("SELECT departments, semesters, sections, updated_at FROM academic_config WHERE config_id = 1");
    const config = rows[0] || {};
    const events = await queryAsync(
      `
        SELECT event_id, title, event_type, start_date, end_date, department, semester, section, notes, created_at
        FROM academic_event
        ORDER BY start_date ASC
      `
    );

    return res.json({
      departments: withSafeJson(config.departments, []),
      semesters: withSafeJson(config.semesters, []),
      sections: withSafeJson(config.sections, []),
      updated_at: config.updated_at,
      events
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error fetching academic configuration" });
  }
});

app.put("/academic-config", verifyToken, checkRole(["admin"]), async (req, res) => {
  const departments = normalizeList(req.body.departments);
  const semesters = normalizeList(req.body.semesters);
  const sections = normalizeList(req.body.sections);

  try {
    await queryAsync(
      `
        UPDATE academic_config
        SET departments = ?, semesters = ?, sections = ?, updated_by = ?
        WHERE config_id = 1
      `,
      [JSON.stringify(departments), JSON.stringify(semesters), JSON.stringify(sections), req.user.user_id]
    );

    return res.json({ message: "Academic configuration updated", departments, semesters, sections });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error updating academic configuration" });
  }
});

app.post("/academic-events", verifyToken, checkRole(["admin"]), async (req, res) => {
  const { title, event_type, start_date, end_date, department, semester, section, notes } = req.body;
  if (!title || !event_type || !start_date || !end_date) {
    return res.status(400).json({ message: "Title, type, and date range are required" });
  }
  if (!["holiday", "exam", "no_class"].includes(String(event_type).toLowerCase())) {
    return res.status(400).json({ message: "Invalid event type" });
  }

  try {
    const result = await queryAsync(
      `
        INSERT INTO academic_event
          (title, event_type, start_date, end_date, department, semester, section, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [title, String(event_type).toLowerCase(), start_date, end_date, department || null, semester || null, section || null, notes || "", req.user.user_id]
    );
    return res.status(201).json({ message: "Academic event added", event_id: result.insertId });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error creating academic event" });
  }
});

app.put("/academic-events/:id", verifyToken, checkRole(["admin"]), async (req, res) => {
  const { title, event_type, start_date, end_date, department, semester, section, notes } = req.body;
  try {
    const result = await queryAsync(
      `
        UPDATE academic_event
        SET title = ?, event_type = ?, start_date = ?, end_date = ?, department = ?, semester = ?, section = ?, notes = ?
        WHERE event_id = ?
      `,
      [title, String(event_type || "").toLowerCase(), start_date, end_date, department || null, semester || null, section || null, notes || "", Number(req.params.id)]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ message: "Event not found" });
    }
    return res.json({ message: "Academic event updated" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error updating academic event" });
  }
});

app.delete("/academic-events/:id", verifyToken, checkRole(["admin"]), async (req, res) => {
  try {
    const result = await queryAsync("DELETE FROM academic_event WHERE event_id = ?", [Number(req.params.id)]);
    if (!result.affectedRows) {
      return res.status(404).json({ message: "Event not found" });
    }
    return res.json({ message: "Academic event deleted" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error deleting academic event" });
  }
});

// ===== PARENT / GUARDIAN PORTAL =====
app.get("/guardians", verifyToken, checkRole(["admin", "teacher", "student"]), async (req, res) => {
  try {
    let rows = [];
    if (req.user.role === "student") {
      const studentRows = await queryAsync("SELECT student_id FROM student WHERE user_id = ? LIMIT 1", [req.user.user_id]);
      if (!studentRows.length) return res.json([]);
      rows = await queryAsync(
        "SELECT * FROM guardian_profile WHERE student_id = ? ORDER BY is_primary DESC, guardian_id DESC",
        [studentRows[0].student_id]
      );
    } else {
      rows = await queryAsync(
        `
          SELECT gp.*, s.name AS student_name, s.student_id
          FROM guardian_profile gp
          JOIN student s ON s.student_id = gp.student_id
          ORDER BY s.name, gp.is_primary DESC, gp.guardian_id DESC
        `
      );
    }
    return res.json(rows);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error fetching guardian profiles" });
  }
});

app.post("/guardians", verifyToken, checkRole(["student"]), async (req, res) => {
  const { guardian_name, relation, phone, email, address, is_primary } = req.body;
  if (!guardian_name) {
    return res.status(400).json({ message: "guardian_name is required" });
  }
  try {
    const studentRows = await queryAsync("SELECT student_id FROM student WHERE user_id = ? LIMIT 1", [req.user.user_id]);
    if (!studentRows.length) return res.status(404).json({ message: "Student profile not found" });
    const studentId = studentRows[0].student_id;

    if (is_primary) {
      await queryAsync("UPDATE guardian_profile SET is_primary = FALSE WHERE student_id = ?", [studentId]);
    }
    const result = await queryAsync(
      `
        INSERT INTO guardian_profile (student_id, guardian_name, relation, phone, email, address, is_primary)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [studentId, guardian_name, relation || "Parent", phone || null, email || null, address || null, !!is_primary]
    );
    return res.status(201).json({ message: "Guardian added", guardian_id: result.insertId });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error creating guardian" });
  }
});

app.put("/guardians/:id", verifyToken, checkRole(["student"]), async (req, res) => {
  const { guardian_name, relation, phone, email, address, is_primary } = req.body;
  try {
    const studentRows = await queryAsync("SELECT student_id FROM student WHERE user_id = ? LIMIT 1", [req.user.user_id]);
    if (!studentRows.length) return res.status(404).json({ message: "Student profile not found" });

    const existing = await queryAsync("SELECT student_id FROM guardian_profile WHERE guardian_id = ?", [Number(req.params.id)]);
    if (!existing.length) return res.status(404).json({ message: "Guardian not found" });
    if (Number(existing[0].student_id) !== Number(studentRows[0].student_id)) {
      return res.status(403).json({ message: "Not authorized to update this guardian" });
    }

    if (is_primary) {
      await queryAsync("UPDATE guardian_profile SET is_primary = FALSE WHERE student_id = ?", [existing[0].student_id]);
    }

    const result = await queryAsync(
      `
        UPDATE guardian_profile
        SET guardian_name = ?, relation = ?, phone = ?, email = ?, address = ?, is_primary = ?
        WHERE guardian_id = ?
      `,
      [guardian_name, relation || "Parent", phone || null, email || null, address || null, !!is_primary, Number(req.params.id)]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Guardian not found" });
    return res.json({ message: "Guardian updated" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error updating guardian" });
  }
});

app.delete("/guardians/:id", verifyToken, checkRole(["student"]), async (req, res) => {
  try {
    const studentRows = await queryAsync("SELECT student_id FROM student WHERE user_id = ? LIMIT 1", [req.user.user_id]);
    if (!studentRows.length) return res.status(404).json({ message: "Student profile not found" });

    const result = await queryAsync(
      "DELETE FROM guardian_profile WHERE guardian_id = ? AND student_id = ?",
      [Number(req.params.id), studentRows[0].student_id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Guardian not found" });
    return res.json({ message: "Guardian deleted" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error deleting guardian" });
  }
});

// ===== LIBRARY / HOSTEL / TRANSPORT =====
app.get("/campus-services", verifyToken, checkRole(["admin", "teacher", "student"]), async (req, res) => {
  try {
    let rows = [];
    if (req.user.role === "admin") {
      rows = await queryAsync(
        `
          SELECT csr.*, u.email AS requester_email
          FROM campus_service_request csr
          JOIN user u ON u.user_id = csr.requester_user_id
          ORDER BY csr.requested_at DESC
        `
      );
    } else {
      rows = await queryAsync(
        `
          SELECT csr.*, u.email AS requester_email
          FROM campus_service_request csr
          JOIN user u ON u.user_id = csr.requester_user_id
          WHERE csr.requester_user_id = ?
          ORDER BY csr.requested_at DESC
        `,
        [req.user.user_id]
      );
    }
    return res.json(rows);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error fetching campus service requests" });
  }
});

app.post("/campus-services", verifyToken, checkRole(["student"]), async (req, res) => {
  const { service_type, title, description } = req.body;
  if (!service_type || !title) {
    return res.status(400).json({ message: "service_type and title are required" });
  }
  if (!["library", "hostel", "transport"].includes(String(service_type).toLowerCase())) {
    return res.status(400).json({ message: "Invalid service_type" });
  }
  try {
    const result = await queryAsync(
      `
        INSERT INTO campus_service_request (service_type, requester_user_id, title, description)
        VALUES (?, ?, ?, ?)
      `,
      [String(service_type).toLowerCase(), req.user.user_id, title, description || ""]
    );
    return res.status(201).json({ message: "Request submitted", request_id: result.insertId });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error creating request" });
  }
});

app.put("/campus-services/:id/review", verifyToken, checkRole(["admin"]), async (req, res) => {
  const { status, review_note } = req.body;
  if (!["approved", "rejected", "completed", "pending"].includes(String(status || "").toLowerCase())) {
    return res.status(400).json({ message: "Invalid status" });
  }
  try {
    const result = await queryAsync(
      `
        UPDATE campus_service_request
        SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, review_note = ?
        WHERE request_id = ?
      `,
      [String(status).toLowerCase(), req.user.user_id, review_note || null, Number(req.params.id)]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Request not found" });
    return res.json({ message: "Request reviewed" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error reviewing request" });
  }
});

// ===== LEAVE / APPROVAL WORKFLOW =====
app.get("/leave-requests", verifyToken, checkRole(["admin", "teacher", "student"]), async (req, res) => {
  try {
    if (req.user.role === "admin") {
      const rows = await queryAsync(
        `
          SELECT lr.*, u.email AS requester_email
          FROM leave_request lr
          JOIN user u ON u.user_id = lr.requester_user_id
          ORDER BY lr.requested_at DESC
        `
      );
      return res.json(rows);
    }

    const rows = await queryAsync(
      `
        SELECT lr.*, u.email AS requester_email
        FROM leave_request lr
        JOIN user u ON u.user_id = lr.requester_user_id
        WHERE lr.requester_user_id = ?
        ORDER BY lr.requested_at DESC
      `,
      [req.user.user_id]
    );
    return res.json(rows);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error fetching leave requests" });
  }
});

app.post("/leave-requests", verifyToken, checkRole(["teacher", "student"]), async (req, res) => {
  const { leave_type, from_date, to_date, reason } = req.body;
  if (!leave_type || !from_date || !to_date) {
    return res.status(400).json({ message: "leave_type, from_date and to_date are required" });
  }
  try {
    const result = await queryAsync(
      `
        INSERT INTO leave_request (requester_user_id, leave_type, from_date, to_date, reason)
        VALUES (?, ?, ?, ?, ?)
      `,
      [req.user.user_id, leave_type, from_date, to_date, reason || ""]
    );
    return res.status(201).json({ message: "Leave request submitted", leave_id: result.insertId });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error submitting leave request" });
  }
});

app.put("/leave-requests/:id/review", verifyToken, checkRole(["admin"]), async (req, res) => {
  const { status, review_note } = req.body;
  if (!["approved", "rejected", "pending"].includes(String(status || "").toLowerCase())) {
    return res.status(400).json({ message: "Invalid status" });
  }
  try {
    const result = await queryAsync(
      `
        UPDATE leave_request
        SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
        WHERE leave_id = ?
      `,
      [String(status).toLowerCase(), review_note || null, req.user.user_id, Number(req.params.id)]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Leave request not found" });
    return res.json({ message: "Leave request updated" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error reviewing leave request" });
  }
});

