# College ERP System - Role-Based Dashboard Setup Guide

## 🎯 Project Overview

Your college ERP system has been completely restructured with **role-based dashboards** and **authentication**. The system now supports three user roles:

1. **👨‍💼 Admin Dashboard** - Full system control
2. **👨‍🏫 Teacher/Faculty Dashboard** - Course and attendance management  
3. **👨‍🎓 Student Dashboard** - View attendance, courses, and results

---

## 📋 Prerequisites

- Node.js 14+ 
- MySQL 5.7+
- npm or yarn

---

## 🚀 Setup Instructions

### Step 1: Database Setup

1. **Create the database and tables:**
   ```sql
   -- Run these SQL files in MySQL in order:
   -- 1. DATABASE_SETUP.sql (creates schema with new user, faculty tables)
   ```

2. **Seed only required bootstrap data (optional):**
   ```sql
   -- Use institution-specific seed scripts only (no shared demo credentials)
   ```

### Step 2: Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Update environment variables:**
   - Create a `.env` file (optional):
     ```
     DB_PASSWORD=your_mysql_password
     JWT_SECRET=your-secret-key
     ```

4. **Start the backend server:**
   ```bash
   node index.js
   ```
   - Server will run on `http://localhost:3001`

### Step 3: Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```
   - Frontend will run on `http://localhost:5173`

---

## Initial Access

Use the seeded admin email from your SQL setup and rotate credentials immediately after first login.
Create teacher and student accounts from the admin panel instead of using shared static demo passwords.

---

## 📊 Dashboard Features

### 👨‍💼 Admin Dashboard
**What Admins Can Do:**
- ✅ View student count, course count, faculty count
- ✅ Manage students (add, edit, delete)
- ✅ Manage courses 
- ✅ Manage faculty/teachers
- ✅ View all attendance records
- ✅ Manage and view results
- ✅ Generate reports
- ✅ System analytics
- **Routes:** `/dashboard` (auto-redirects based on role)

### 👨‍🏫 Teacher Dashboard  
**What Teachers Can Do:**
- ✅ View assigned courses
- ✅ Mark and edit attendance
- ✅ View student list
- ✅ Upload/manage results
- ✅ View attendance reports
- ✅ Check pending tasks (attendance, results)
- **Routes:** `/dashboard`, `/attendance`, `/courses`, `/results`

### 👨‍🎓 Student Dashboard
**What Students Can Do:**
- ✅ View enrolled courses
- ✅ View personal attendance records
- ✅ Check attendance percentage
- ✅ View published results
- ✅ See grades and performance
- ✅ View class schedule
- **Routes:** `/dashboard`, `/attendance`, `/results`

---

## 🎨 New Features Added

### Authentication System
- ✅ **Login/Signup Page** with smooth animations
- ✅ JWT token-based authentication
- ✅ Password hashing with bcryptjs
- ✅ Role-based protected routes
- ✅ Token persistence (localStorage)

### Animations
- ✅ Slide-up animation on page load
- ✅ Fade-in effects for form fields
- ✅ Hover effects on cards
- ✅ Shake animation for errors
- ✅ Pulse animation for success messages
- ✅ Floating background elements on login

### Database Schema Changes
- ✅ Added `user` table for authentication
- ✅ Added `faculty` table for teacher profiles
- ✅ Updated `student` table to link with user accounts
- ✅ Added `course.faculty_id` to assign courses to teachers
- ✅ Enhanced timestamps and tracking

---

## 📁 Project Structure

```
college-ERP-system/
├── backend/
│   ├── index.js (with auth routes & middleware)
│   ├── package.json (updated with bcryptjs & jwt)
│   └── ...
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.jsx (NEW - State management)
│   │   ├── components/
│   │   │   ├── ProtectedRoute.jsx (NEW - Route protection)
│   │   │   ├── Sidebar.jsx
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── Auth.jsx (NEW - Login/Signup with animations)
│   │   │   ├── Auth.css (NEW - Beautiful animations)
│   │   │   ├── AdminDashboard.jsx (NEW)
│   │   │   ├── TeacherDashboard.jsx (NEW)
│   │   │   ├── StudentDashboard.jsx (NEW)
│   │   │   ├── Dashboard.css (NEW - Dashboard styling)
│   │   │   └── ...
│   │   ├── App.jsx (UPDATED - Role-based routing)
│   │   └── main.jsx
│   ├── package.json
│   └── ...
├── DATABASE_SETUP.sql (UPDATED - User & Faculty tables)
├── (optional) institution seed SQL scripts
└── README.md (NEW - This file)
```

---

## 🔄 User Flow

### New User Registration
1. Visit `/login`
2. Click "Sign Up" 
3. Fill in details (name, email, password, role, etc.)
4. Submit - Account created
5. Login with credentials
6. Redirected to role-specific dashboard

### Login Flow
1. Visit `/login`
2. Enter email and password
3. JWT token generated and stored
4. Redirected to role-specific dashboard:
   - Admin → Admin Dashboard
   - Teacher → Teacher Dashboard
   - Student → Student Dashboard

### Protected Routes
All routes except `/` and `/login` are protected:
- Without token → Redirected to login
- Invalid role → Access denied message
- Valid token & role → Access granted

---

## 🛠️ API Endpoints

### Authentication Endpoints
```
POST /auth/signup
  - Body: { email, password, role, name, department, year, phone }
  - Response: { message, user_id }

POST /auth/login
  - Body: { email, password }
  - Response: { token, user, profile }

GET /auth/verify
  - Headers: Authorization: Bearer <token>
  - Response: { user }
```

### Protected Endpoints (Others)
All existing endpoints (`/students`, `/courses`, `/attendance`, `/results`) are still available.
Students and teachers can only access data relevant to them (implement row-level filtering as needed).

---

## 🚨 Important Notes

1. **Password Hashing:** Passwords are hashed with bcryptjs (10 salt rounds)
2. **JWT Secret:** Change `JWT_SECRET` in production
3. **CORS:** Backend is configured for `localhost:5173`
4. **Token Expiry:** JWT tokens expire in 24 hours
5. **Session:** Tokens stored in localStorage (clear on logout)

---

## 🐛 Troubleshooting

### "Cannot connect to MySQL"
- Verify MySQL is running
- Check `DB_PASSWORD` in `backend/.env`
- Check database name: `college_erp`

### "Login not working"
- Ensure backend is running on port 3001
- Check browser console for errors
- Verify email exists in database

### "Dashboard not loading"
- Check token in localStorage
- Verify JWT_SECRET matches
- Check user role in database

### "Initial admin login not working"
- Re-run `DATABASE_SETUP.sql` to seed admin rows
- Verify `DEFAULT_ADMIN_EMAIL` and DB records match
- Reset password from admin once login succeeds

---

## 📝 Next Steps

1. **Implement Row-Level Security:**
   - Teachers see only their assigned courses
   - Students see only their enrolled courses
   - Filter attendance/results by student/course

2. **Add More Features:**
   - Notifications system
   - File uploads for assignments
   - Grade calculation
   - GPA tracking
   - Transcript generation

3. **Enhance Security:**
   - Add password reset functionality  
   - Implement email verification
   - Add rate limiting
   - Log all admin actions

4. **Improve UI:**
   - Add more animations
   - Mobile app version
   - Dark mode
   - Responsive improvements

---

## 📞 Support

For issues or questions, refer to:
- Backend logs in terminal
- Browser console (F12)
- MySQL error logs
- Check database for data presence

---

## ✅ Checklist Before Going Live

- [ ] Change JWT_SECRET to a strong random string
- [ ] Update MySQL password in environment
- [ ] Test all authentication flows
- [ ] Test each dashboard functionality
- [ ] Add faculty/courses via admin panel
- [ ] Test attendance marking
- [ ] Test result uploads
- [ ] Create backup of database
- [ ] Set up error logging
- [ ] Test on mobile devices

---

## 🎓 Happy Learning!

Your college ERP system is now fully functional with role-based dashboards and authentication! 🚀

---

**Last Updated:** March 2026
**Version:** 2.0 (Role-Based Dashboards)


