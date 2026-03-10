-- College ERP Database Setup Instructions
-- Run these commands in MySQL to set up the required tables

-- ===== STEP 1: Drop existing tables if they exist (in correct order due to foreign keys) =====
DROP TABLE IF EXISTS student_course;
DROP TABLE IF EXISTS result;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS course;
DROP TABLE IF EXISTS student;

-- ===== STEP 2: Create student table =====
CREATE TABLE student (
  student_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  department VARCHAR(50),
  year INT,
  email VARCHAR(100),
  phone VARCHAR(15),
  enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== STEP 3: Create course table (with AUTO_INCREMENT) =====
CREATE TABLE course (
  course_id INT PRIMARY KEY AUTO_INCREMENT,
  course_name VARCHAR(100) NOT NULL,
  department VARCHAR(50)
);

-- ===== STEP 4: Create attendance table =====
CREATE TABLE attendance (
  attendance_id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  date DATE,
  status ENUM('Present', 'Absent') DEFAULT 'Present',
  FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES course(course_id) ON DELETE CASCADE
);

-- ===== STEP 5: Create result table =====
CREATE TABLE result (
  result_id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  marks_obtained DECIMAL(5,2),
  total_marks DECIMAL(5,2),
  FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES course(course_id) ON DELETE CASCADE
);

-- ===== STEP 6: Create student_course junction table for many-to-many relationship =====
CREATE TABLE student_course (
  enrollment_id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES course(course_id) ON DELETE CASCADE,
  UNIQUE KEY unique_enrollment (student_id, course_id)
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

