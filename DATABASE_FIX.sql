-- ===== QUICK FIX for existing tables with foreign key constraints =====
-- Run these commands in MySQL to fix the "Cannot change column" error
-- Copy and paste each section into mysql> prompt

-- STEP 1: Drop all foreign key constraints from dependent tables
ALTER TABLE attendance DROP FOREIGN KEY attendance_ibfk_1;
ALTER TABLE attendance DROP FOREIGN KEY attendance_ibfk_2;
ALTER TABLE result DROP FOREIGN KEY result_ibfk_1;
ALTER TABLE result DROP FOREIGN KEY result_ibfk_2;
ALTER TABLE student_course DROP FOREIGN KEY student_course_ibfk_1;
ALTER TABLE student_course DROP FOREIGN KEY student_course_ibfk_2;

-- STEP 2: Now modify the course_id column to AUTO_INCREMENT
ALTER TABLE course MODIFY course_id INT AUTO_INCREMENT;
ALTER TABLE student MODIFY student_id INT AUTO_INCREMENT;

-- STEP 3: Re-add all foreign key constraints
ALTER TABLE attendance ADD CONSTRAINT attendance_ibfk_1 FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE;
ALTER TABLE attendance ADD CONSTRAINT attendance_ibfk_2 FOREIGN KEY (course_id) REFERENCES course(course_id) ON DELETE CASCADE;
ALTER TABLE result ADD CONSTRAINT result_ibfk_1 FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE;
ALTER TABLE result ADD CONSTRAINT result_ibfk_2 FOREIGN KEY (course_id) REFERENCES course(course_id) ON DELETE CASCADE;
ALTER TABLE student_course ADD CONSTRAINT student_course_ibfk_1 FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE;
ALTER TABLE student_course ADD CONSTRAINT student_course_ibfk_2 FOREIGN KEY (course_id) REFERENCES course(course_id) ON DELETE CASCADE;

-- VERIFICATION: Check if columns are now AUTO_INCREMENT
DESCRIBE student;
DESCRIBE course;

-- If successful, you should see:
-- student_id should have "auto_increment" in the Extra column
-- course_id should have "auto_increment" in the Extra column
