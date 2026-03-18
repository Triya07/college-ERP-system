-- College ERP Database Setup Instructions
-- Run these commands in MySQL to set up the required tables

-- ===== STEP 1: Drop existing tables if they exist (in correct order due to foreign keys) =====
DROP TABLE IF EXISTS student_course;
DROP TABLE IF EXISTS result;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS course;
DROP TABLE IF EXISTS faculty;
DROP TABLE IF EXISTS admin;
DROP TABLE IF EXISTS student;
DROP TABLE IF EXISTS user;

-- ===== STEP 2: Create user table (for authentication) =====
CREATE TABLE user (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'teacher', 'student') NOT NULL,
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
  roll_number VARCHAR(50) UNIQUE,
  phone VARCHAR(15),
  enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE
);

-- ===== STEP 4: Create course table =====
CREATE TABLE course (
  course_id INT PRIMARY KEY AUTO_INCREMENT,
  course_name VARCHAR(100) NOT NULL,
  course_code VARCHAR(20) UNIQUE NOT NULL,
  department VARCHAR(50),
  faculty_id INT,
  credits INT DEFAULT 4,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
  attendance_date DATE NOT NULL,
  status ENUM('Present', 'Absent') DEFAULT 'Present',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES course(course_id) ON DELETE CASCADE
);

-- ===== STEP 7: Create result table =====
CREATE TABLE result (
  result_id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  marks_obtained DECIMAL(5,2),
  total_marks DECIMAL(5,2) DEFAULT 100,
  grade VARCHAR(2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES course(course_id) ON DELETE CASCADE
);

-- ===== VERIFICATION: Verify tables were created correctly =====
SHOW TABLES;
DESCRIBE student;
DESCRIBE course;
DESCRIBE attendance;
DESCRIBE result;
DESCRIBE student_course;

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

