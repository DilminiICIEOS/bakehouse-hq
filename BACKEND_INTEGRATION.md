/**
 * Backend Integration Guide for Bakery HQ Frontend
 * 
 * This file contains all the necessary updates to connect the React frontend
 * with the Django backend API.
 */

// ============================================================
// STEP 1: Update Environment Configuration
// ============================================================

// Create .env.local in the frontend root directory:

/*
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_APP_NAME=Bakery HQ
VITE_JWT_STORAGE_KEY=bakery_auth_v2
*/

// For production:
/*
VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
*/

// ============================================================
// STEP 2: Install Required Dependencies
// ============================================================

/*
npm install axios
npm install @types/axios
npm install zustand  (if not already installed)
npm install js-cookie
*/

// ============================================================
// STEP 3: Updated File Locations
// ============================================================

/*
Create/Update these files:
- src/lib/api.ts             (replaced with backend calls)
- src/lib/auth.tsx           (updated with real JWT)
- src/hooks/useAuth.ts       (new hook for API calls)
- src/services/api.service.ts (centralized API service)
*/

// ============================================================
// STEP 4: Database Initialization
// ============================================================

/*
Backend Setup:

cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py seed_data
python manage.py runserver

Demo credentials:
- admin@bakery.com / demo1234 (Admin)
- manager@bakery.com / demo1234 (Manager)
- sales@bakery.com / demo1234 (Salesperson)
*/

// ============================================================
// STEP 5: Running Both Frontend and Backend
// ============================================================

/*
Terminal 1 - Frontend:
cd bakehouse-hq
npm install
npm run dev

Terminal 2 - Backend:
cd backend
source venv/bin/activate
python manage.py runserver

Access:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Swagger Docs: http://localhost:8000/api/schema/swagger/
*/

// ============================================================
// STEP 6: Docker Development
// ============================================================

/*
From backend directory:
docker-compose up --build

This will start:
- Backend API: http://localhost:8000
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- Celery worker and beat scheduler
*/
