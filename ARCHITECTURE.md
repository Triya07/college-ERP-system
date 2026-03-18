# College ERP System - Architecture & Flow Diagram

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐                                             │
│  │  Auth Page   │  (Login/Signup with Animations)            │
│  └──────┬───────┘                                             │
│         │                                                      │
│         ├──────────────┬──────────────┬─────────────────┐     │
│         │              │              │                 │     │
│    ┌────▼────┐  ┌─────▼──┐  ┌──────▼──┐  ┌──────────▼─┐    │
│    │  Admin  │  │Teacher │  │ Student │  │   Home     │    │
│    │Dashboard│  │Dashboard│  │Dashboard│  │   Page     │    │
│    └─────────┘  └────────┘  └─────────┘  └────────────┘    │
│                                                               │
│  AuthContext (JWT Token Management)                         │
│  ProtectedRoute (Role-Based Access Control)                 │
│                                                               │
└─────────────────────────────────────────────────────────────────┘
                            ▲
                            │ HTTP/AXIOS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Express.js)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Authentication Routes:                                        │
│  ├─ POST /auth/signup    (Create new user)                    │
│  ├─ POST /auth/login     (Login & get JWT)                    │
│  └─ GET /auth/verify     (Verify token)                       │
│                                                                 │
│  Middleware:                                                   │
│  ├─ verifyToken (Check JWT)                                   │
│  └─ checkRole (Validate user role)                            │
│                                                                 │
│  Protected Routes:                                             │
│  ├─ GET /students        (Admin, Teacher)                     │
│  ├─ POST /students       (Admin only)                         │
│  ├─ GET /courses         (All roles)                          │
│  ├─ GET /attendance      (All roles)                          │
│  ├─ POST /attendance     (Teacher only)                       │
│  └─ GET /results         (Admin, Teacher, Student)            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ▲
                            │ MySQL Driver
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (MySQL)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Tables:                                                        │
│  ├─ user (email, password, role, is_active)                   │
│  ├─ faculty (user_id, name, department, phone, exp)           │
│  ├─ student (user_id, name, department, year, roll_no)        │
│  ├─ course (course_name, course_code, faculty_id, credits)    │
│  ├─ student_course (student_id, course_id)                    │
│  ├─ attendance (student_id, course_id, date, status)          │
│  └─ result (student_id, course_id, marks, grade)              │
│                                                                 │
│  Relationships:                                                │
│  user ──1:1──► faculty                                         │
│  user ──1:1──► student                                         │
│  faculty ──1:N──► course                                       │
│  student ──N:M──► course (via student_course)                  │
│  student ──N:M──► course (via attendance)                      │
│  student ──N:M──► course (via result)                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication Flow

```
User (Browser)
     │
     │ 1. Visit /login
     ├─────────────────────┐
     │                     ▼
     │              Auth Page (React)
     │              - Login Form
     │              - Signup Form
     │
     │ 2. Enter Credentials
     │
     ├─────────────────────┐
     │                     ▼
     │            POST /auth/login
     │            (Backend Receives)
     │                     │
     │                     ├── Check Email in DB
     │                     ├── Verify Password (bcrypt)
     │                     ├── Generate JWT Token
     │                     └── Fetch User Profile
     │
     │ 3. Receive JWT Token
     │
     ├─────────────────────┐
     │                     ▼
     │          AuthContext (React)
     │          - Store Token in localStorage
     │          - Set Default Axios Header
     │          - Store User Info
     │
     │ 4. Redirect to Dashboard
     │
     ├─────────────────────┐
     │                     ▼
     │          Role-Based Redirect
     │          ├─ Admin → Admin Dashboard
     │          ├─ Teacher → Teacher Dashboard
     │          └─ Student → Student Dashboard
     │
     │ 5. Access Protected Routes
     │
     └─────────────────────┐
                          ▼
              ProtectedRoute Component
              ├── Check if Token Exists
              ├── Verify Token Valid
              ├── Check User Role
              └── Grant/Deny Access
```

---

## 👥 Role-Based Permissions

```
┌──────────────────────────────────────────────────────────────────┐
│                        ADMIN ROLE                                │
├──────────────────────────────────────────────────────────────────┤
│ ✅ View Dashboard        │ ✅ Add Students      │ ✅ Edit Students    │
│ ✅ Delete Students       │ ✅ Add Courses       │ ✅ Edit Courses     │
│ ✅ Manage Faculty        │ ✅ View All Reports  │ ✅ View Attendance  │
│ ✅ manage Results        │ ✅ System Analytics  │ ✅ Export Data      │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                   TEACHER/FACULTY ROLE                            │
├──────────────────────────────────────────────────────────────────┤
│ ✅ View Dashboard        │ ✅ Mark Attendance  │ ✅ Edit Attendance  │
│ ✅ View Courses          │ ✅ View Students    │ ✅ Upload Results   │
│ ✅ Manage Results        │ ✅ View Reports     │ ❌ Create Students  │
│ ❌ Delete Students       │ ❌ Edit Courses     │ ❌ Manage Faculty   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                      STUDENT ROLE                                 │
├──────────────────────────────────────────────────────────────────┤
│ ✅ View Dashboard        │ ✅ View Courses     │ ✅ View Attendance  │
│ ✅ Check Attendance %    │ ✅ View Results     │ ✅ View Grades      │
│ ❌ Edit Attendance       │ ❌ Upload Results   │ ❌ Manage Courses   │
│ ❌ Add/Delete Students   │ ❌ Create Courses   │ ❌ View Other Data  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📊 Dashboard Layout

### Admin Dashboard
```
┌─────────────────────────────────────────────────────────┐
│ Admin Dashboard                          [Logout Button] │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Students: 45 │  │ Courses: 12  │  │ Faculty: 9     │ │
│  └──────────────┘  └──────────────┘  └────────────────┘ │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Avg Attend.  │  │   [Feature]  │  │   [Feature]    │ │
│  │    95%       │  │              │  │                │ │
│  └──────────────┘  └──────────────┘  └────────────────┘ │
│                                                          │
│  Admin Controls:                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Manage       │  │ Manage       │  │ Manage Faculty │ │
│  │ Students     │  │ Courses      │  │                │ │
│  └──────────────┘  └──────────────┘  └────────────────┘ │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │ View Reports │  │ View Results │                    │
│  └──────────────┘  └──────────────┘                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Teacher Dashboard
```
┌─────────────────────────────────────────────────────────┐
│ Teacher Dashboard                        [Logout Button] │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Courses: 5   │  │ Students:120 │  │ Pending Att: 3 │ │
│  └──────────────┘  └──────────────┘  └────────────────┘ │
│                                                          │
│  Core Functions:                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ View Courses │  │ Mark         │  │ Manage Results │ │
│  │              │  │ Attendance   │  │                │ │
│  └──────────────┘  └──────────────┘  └────────────────┘ │
│                                                          │
│  ┌──────────────┐                                       │
│  │ View Reports │                                       │
│  └──────────────┘                                       │
│                                                          │
│  Today's Overview:                                       │
│  Classes: 3  |  Students to Mark: 125  |  Pending: 8   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Student Dashboard  
```
┌─────────────────────────────────────────────────────────┐
│ Student Dashboard                        [Logout Button] │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Courses: 6   │  │ Attendance   │  │ Results: 6     │ │
│  │              │  │    92%       │  │                │ │
│  └──────────────┘  └──────────────┘  └────────────────┘ │
│                                                          │
│  ┌──────────────┐                                       │
│  │ Good Status  │                                       │
│  └──────────────┘                                       │
│                                                          │
│  My Courses:                                             │
│  ┌────────────────────────────────────────────┐        │
│  │ Data Structures          [View] [Results]  │        │
│  │ Database Systems         [View] [Results]  │        │
│  │ Web Development          [View] [Results]  │        │
│  │ Machine Learning         [View] [Results]  │        │
│  └────────────────────────────────────────────┘        │
│                                                          │
│  Academic Performance:                                   │
│  GPA: 3.8/4.0  |  Credits: 45/120  |  Status: Excellent│
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 Animation Effects

| Animation | Trigger | Effect |
|-----------|---------|--------|
| Slide Up | Page Load | Content slides up with fade |
| Fade In | Form Fields | Fields fade in with delay |
| Shake | Error Message | Error shakes left/right |
| Pulse | Success Message | Success message pulses |
| Hover | Card/Button | Lift up, enhanced shadow |
| Float | Background Elements | Circular elements float up/down |

---

## 🔄 Data Flow Example: Student Attends Class

```
1. Teacher logs in
   └─► Teacher Dashboard loads

2. Teacher opens "Mark Attendance"
   └─► Attendance page displays students

3. Teacher marks students as Present/Absent
   └─► POST /attendance (with JWT token)

4. Backend verifies:
   ├─ Token is valid
   ├─ User role is "teacher"
   └─ Data is valid

5. Record saved to database
   └─► attendance table updated

6. Student logs in later
   └─► Student Dashboard loads

7. Student views "My Attendance"
   └─► GET /attendance (filtered for this student)

8. Attendance records displayed
   └─► Shows: Present/Absent for each date
       └─► Calculates percentage: 92% ✅
```

---

## 📈 Database Schema Relationships

```
user (1)
  │
  ├──(1)──► faculty
  │         ├── department
  │         └── phone
  │
  └──(1)──► student
            ├── department
            ├── year
            ├── roll_number
            │
            └──(N)──┐
                   │ student_course (N)
                   │
                   └──(N)──► course
                             ├── faculty_id (FK)
                             └── credits
```

---

## ✨ Key Improvements Summary

| Feature | Before | After |
|---------|--------|-------|
| Authentication | None | ✅ JWT-based |
| User Roles | Not Implemented | ✅ Admin, Teacher, Student |
| Password Security | Plaintext | ✅ Bcrypt Hashed |
| Access Control | None | ✅ Role-Based Routes |
| Animations | Basic | ✅ Smooth Transitions |
| Login Page | Not Exist | ✅ Beautiful UI |
| Dashboards | Common | ✅ Role-Specific |
| Token Management | N/A | ✅ LocalStorage |
| Route Protection | N/A | ✅ Protected Routes |

---

Generated for College ERP System v2.0 - Role-Based Dashboards
