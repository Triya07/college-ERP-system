-- College ERP Database Setup Instructions
-- Run these commands in MySQL to set up the required tables
-- NOTE: CHECK constraints are enforced in MySQL 8.0.16+.

-- ===== PRE-STEP: Ensure target database is selected =====
CREATE DATABASE IF NOT EXISTS college_erp;
USE college_erp;

-- ===== STEP 1: Drop existing tables if they exist (in correct order due to foreign keys) =====
-- Temporarily disable FK checks so reruns also work when older leftover tables
-- still reference current tables from a previous schema revision.
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS student_course;
DROP TABLE IF EXISTS class_attendance;
DROP TABLE IF EXISTS class_student;
DROP TABLE IF EXISTS class_group;
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS password_reset_token;
DROP TABLE IF EXISTS academic_event;
DROP TABLE IF EXISTS academic_config;
DROP TABLE IF EXISTS course_registration_request;
DROP TABLE IF EXISTS leave_request;
DROP TABLE IF EXISTS campus_service_request;
DROP TABLE IF EXISTS guardian_profile;
DROP TABLE IF EXISTS notification;
DROP TABLE IF EXISTS announcement;
DROP TABLE IF EXISTS fee_record;
DROP TABLE IF EXISTS timetable_entry;
DROP TABLE IF EXISTS result;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS course;
DROP TABLE IF EXISTS faculty;
DROP TABLE IF EXISTS admin;
DROP TABLE IF EXISTS student;
DROP TABLE IF EXISTS user;

SET FOREIGN_KEY_CHECKS = 1;

-- ===== STEP 2: Create user table (for authentication) =====
CREATE TABLE user (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'teacher', 'student') NOT NULL,
  username VARCHAR(80) UNIQUE,
  academic_id VARCHAR(80),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== STEP 2.5: Create admin table =====
CREATE TABLE admin (
  admin_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  department VARCHAR(50),
  phone VARCHAR(15),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE
);

-- ===== STEP 2.75: Create faculty/teacher table =====
CREATE TABLE faculty (
  faculty_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  department VARCHAR(50),
  phone VARCHAR(15),
  academic_id VARCHAR(80),
  qualification VARCHAR(100),
  experience INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE
);

-- ===== STEP 3: Create student table =====
CREATE TABLE student (
  student_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  department VARCHAR(50),
  year INT,
  semester VARCHAR(20),
  section VARCHAR(20),
  roll_number VARCHAR(50) UNIQUE,
  academic_id VARCHAR(80),
  phone VARCHAR(15),
  enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_student_year_range
    CHECK (year BETWEEN 1 AND 4),
  CONSTRAINT chk_student_semester_range
    CHECK (semester IN ('1','2','3','4','5','6','7','8')),
  CONSTRAINT chk_student_year_semester_pair
    CHECK (
      (year = 1 AND semester IN ('1','2')) OR
      (year = 2 AND semester IN ('3','4')) OR
      (year = 3 AND semester IN ('5','6')) OR
      (year = 4 AND semester IN ('7','8'))
    ),
  FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE
);

-- ===== STEP 4: Create course table =====
CREATE TABLE course (
  course_id INT PRIMARY KEY AUTO_INCREMENT,
  course_name VARCHAR(100) NOT NULL,
  course_code VARCHAR(20) UNIQUE NOT NULL,
  semester VARCHAR(20),
  department VARCHAR(50),
  description TEXT,
  faculty_id INT,
  credits INT DEFAULT 4,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_course_semester_range
    CHECK (semester IS NULL OR semester IN ('1','2','3','4','5','6','7','8')),
  FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE SET NULL
);

-- ===== STEP 5: Create student_course table (enrollment) =====
CREATE TABLE student_course (
  enrollment_id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  enrolled_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES course(course_id) ON DELETE CASCADE,
  UNIQUE KEY unique_enrollment (student_id, course_id)
);

-- ===== STEP 6: Create attendance table =====
CREATE TABLE attendance (
  attendance_id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  date DATE NOT NULL,
  status ENUM('Present', 'Absent') DEFAULT 'Present',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES course(course_id) ON DELETE CASCADE,
  UNIQUE KEY uniq_attendance_per_day (student_id, course_id, date)
);

-- ===== STEP 7: Create result table =====
CREATE TABLE result (
  result_id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  exam_type ENUM('midsem','endsem','semester') DEFAULT 'semester',
  marks_obtained DECIMAL(5,2),
  total_marks DECIMAL(5,2) DEFAULT 100,
  grade VARCHAR(2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES course(course_id) ON DELETE CASCADE
);

-- ===== STEP 8: Create timetable table =====
CREATE TABLE timetable_entry (
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
);

-- ===== STEP 9: Create fee table =====
CREATE TABLE fee_record (
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
);

-- ===== STEP 10: Create notifications table =====
CREATE TABLE notification (
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
);

-- ===== STEP 11: Create announcements table =====
CREATE TABLE announcement (
  announcement_id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(150) NOT NULL,
  content TEXT NOT NULL,
  priority ENUM('Low','Normal','High','Critical') DEFAULT 'Normal',
  expires_at DATE,
  is_active BOOLEAN DEFAULT TRUE,
  posted_by INT,
  target_roles VARCHAR(120),
  target_course_id INT,
  target_class_id INT,
  target_semester VARCHAR(20),
  target_section VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (posted_by) REFERENCES user(user_id) ON DELETE SET NULL,
  FOREIGN KEY (target_course_id) REFERENCES course(course_id) ON DELETE SET NULL
);

-- ===== STEP 12: Create course registration requests table =====
CREATE TABLE course_registration_request (
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
);

-- ===== STEP 13: Create class management tables =====
CREATE TABLE class_group (
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
);

CREATE TABLE class_student (
  id INT PRIMARY KEY AUTO_INCREMENT,
  class_id INT NOT NULL,
  student_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_class_student (class_id, student_id),
  FOREIGN KEY (class_id) REFERENCES class_group(class_id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE
);

CREATE TABLE class_attendance (
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
);

-- ===== STEP 14: Academic configuration tables =====
CREATE TABLE academic_config (
  config_id INT PRIMARY KEY,
  departments TEXT,
  semesters TEXT,
  sections TEXT,
  updated_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES user(user_id) ON DELETE SET NULL
);

INSERT INTO academic_config (config_id, departments, semesters, sections)
VALUES
  (1, '["CSE","IT","ECE","ME"]', '["1","2","3","4","5","6","7","8"]', '["A","B","C"]');

CREATE TABLE academic_event (
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
);

CREATE TABLE password_reset_token (
  token_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  requested_ip VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE
);

CREATE TABLE audit_log (
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
);

-- ===== STEP 15: Parent / Guardian portal =====
CREATE TABLE guardian_profile (
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
);

-- ===== STEP 16: Library / Hostel / Transport workflows =====
CREATE TABLE campus_service_request (
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
);

-- ===== STEP 17: Leave / approval workflow =====
CREATE TABLE leave_request (
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
);

-- ===== STEP 18: Performance indexes for evaluation =====
CREATE INDEX idx_notification_user_read_created ON notification (user_id, is_read, created_at);
CREATE INDEX idx_registration_student_status ON course_registration_request (student_id, status);
CREATE INDEX idx_attendance_student_course_date ON attendance (student_id, course_id, date);
CREATE INDEX idx_class_attendance_student_class_date ON class_attendance (student_id, class_id, session_date);
CREATE INDEX idx_leave_request_user_status ON leave_request (requester_user_id, status);
CREATE INDEX idx_service_request_user_status ON campus_service_request (requester_user_id, status);

-- ===== STEP 19: Seed default admin account =====
-- NOTE: reset this seeded admin password immediately after first login.
INSERT INTO user (email, password, role, username, academic_id, is_active)
VALUES ('admin@college.com', '$2a$10$Ad/xzZffP2LxmsNLv2ADjeQnKtpRguOnQKjA4EUKgNU3EH04y8iRO', 'admin', 'admin', 'ADMIN001', TRUE)
ON DUPLICATE KEY UPDATE
  password = '$2a$10$Ad/xzZffP2LxmsNLv2ADjeQnKtpRguOnQKjA4EUKgNU3EH04y8iRO',
  role = 'admin',
  username = 'admin',
  academic_id = 'ADMIN001',
  is_active = TRUE;

INSERT INTO admin (user_id, name, department, phone)
SELECT u.user_id, 'System Admin', 'Administration', ''
FROM user u
WHERE u.email = 'admin@college.com'
ON DUPLICATE KEY UPDATE
  name = 'System Admin',
  department = 'Administration',
  phone = '';

-- ===== STEP 20: Constraint Validation (for viva/demo) =====
-- Expected: success
-- INSERT INTO student (user_id, name, department, year, semester, section, roll_number, academic_id, phone)
-- VALUES (99991, 'Valid Demo', 'CSE', 2, '4', 'A', 'DEMO_VALID_001', 'DEMO_VALID_001', '9999999999');

-- Expected: fail (Year 1 cannot be Semester 5)
-- INSERT INTO student (user_id, name, department, year, semester, section, roll_number, academic_id, phone)
-- VALUES (99992, 'Invalid Demo', 'CSE', 1, '5', 'A', 'DEMO_INVALID_001', 'DEMO_INVALID_001', '9999999998');

-- ===== VERIFICATION: Verify tables were created correctly =====
SHOW TABLES;
DESCRIBE student;
DESCRIBE course;
DESCRIBE attendance;
DESCRIBE result;
DESCRIBE student_course;
DESCRIBE class_group;
DESCRIBE class_attendance;
DESCRIBE academic_config;
DESCRIBE academic_event;

-- ===== If you already have tables with foreign key issues, run these steps: =====
-- 
-- Step 1: Drop all foreign key constraints from dependent tables
-- ALTER TABLE attendance DROP FOREIGN KEY attendance_ibfk_1;
-- ALTER TABLE attendance DROP FOREIGN KEY attendance_ibfk_2;
-- ALTER TABLE result DROP FOREIGN KEY result_ibfk_1;
-- ALTER TABLE result DROP FOREIGN KEY result_ibfk_2;
-- ALTER TABLE student_course DROP FOREIGN KEY student_course_ibfk_1;
-- ALTER TABLE student_course DROP FOREIGN KEY student_course_ibfk_2;
--
-- Step 2: Modify the primary keys to AUTO_INCREMENT
-- ALTER TABLE course MODIFY course_id INT AUTO_INCREMENT;
-- ALTER TABLE student MODIFY student_id INT AUTO_INCREMENT;
--
-- Step 3: Re-add all foreign key constraints
-- ALTER TABLE attendance ADD CONSTRAINT attendance_ibfk_1 FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE;
-- ALTER TABLE attendance ADD CONSTRAINT attendance_ibfk_2 FOREIGN KEY (course_id) REFERENCES course(course_id) ON DELETE CASCADE;
-- ALTER TABLE result ADD CONSTRAINT result_ibfk_1 FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE;
-- ALTER TABLE result ADD CONSTRAINT result_ibfk_2 FOREIGN KEY (course_id) REFERENCES course(course_id) ON DELETE CASCADE;
-- ALTER TABLE student_course ADD CONSTRAINT student_course_ibfk_1 FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE;
-- ALTER TABLE student_course ADD CONSTRAINT student_course_ibfk_2 FOREIGN KEY (course_id) REFERENCES course(course_id) ON DELETE CASCADE;
--
-- ===== Sample Data (optional) =====
-- INSERT INTO student (name, department, year, email, phone) VALUES
-- ('Rahul Kumar', 'CSE', 1, 'rahul@college.com', '9876543210'),
-- ('Priya Singh', 'IT', 2, 'priya@college.com', '9876543211'),
-- ('Amit Patel', 'CSE', 1, 'amit@college.com', '9876543212');
--
-- INSERT INTO course (course_name, department) VALUES
-- ('Data Science', 'CSE'),
-- ('Database Systems', 'CSE'),
-- ('Operating Systems', 'IT'),
-- ('Web Development', 'IT');

