# College ERP System

Full-stack College ERP built with:
- `frontend`: React + Vite + Axios
- `backend`: Node.js + Express + MySQL

## Features
- JWT authentication with role-based access (`admin`, `teacher`, `student`)
- Student, faculty, course, class, attendance, result, fee, timetable modules
- Announcement board, course registration workflow, academic configuration
- Security hardening:
  - protected critical routes
  - scoped teacher/student data access
  - auth rate limiting
  - token-based password reset
  - audit logging for sensitive operations

## Prerequisites
- Node.js 20+
- MySQL 8+

## Environment Setup

### Backend
1. Copy [backend/.env.example](/c:/Users/Admin/ibisPaint/Downloads/college-ERP-system/backend/.env.example) to `backend/.env`
2. Fill required values:
   - `PORT`
   - `JWT_SECRET`
   - `DB_PASSWORD`
3. Optional password reset delivery:
   - set `NODE_ENV=production`
   - set `RESET_TOKEN_WEBHOOK_URL` to your mail/SMS service endpoint

### Frontend
1. Copy [frontend/.env.example](/c:/Users/Admin/ibisPaint/Downloads/college-ERP-system/frontend/.env.example) to `frontend/.env`
2. Set `VITE_API_BASE_URL` (for local dev: `http://localhost:3001`)

## Database Setup
Run [DATABASE_SETUP.sql](/c:/Users/Admin/ibisPaint/Downloads/college-ERP-system/DATABASE_SETUP.sql) in MySQL.

Important:
- rotate seeded admin credentials immediately after first login
- never keep shared default passwords in production

## Local Development

Install dependencies:
```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

Run backend:
```bash
npm run dev:backend
```

Run frontend:
```bash
npm run dev:frontend
```

## Scripts
- Root
  - `npm run dev` -> frontend dev server
  - `npm run build` -> frontend production build
- Backend
  - `npm run dev --prefix backend`
  - `npm run check --prefix backend`
  - `npm test --prefix backend`
- Frontend
  - `npm run dev --prefix frontend`
  - `npm run lint --prefix frontend`
  - `npm run build --prefix frontend`

## CI
CI pipeline is configured at:
- [.github/workflows/ci.yml](/c:/Users/Admin/ibisPaint/Downloads/college-ERP-system/.github/workflows/ci.yml)

It runs:
- frontend lint + build
- backend syntax check + tests
