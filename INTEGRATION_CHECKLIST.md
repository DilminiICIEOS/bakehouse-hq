# Complete Integration Checklist

## Backend Setup (Completed ✓)

- [x] Django project structure with 6 apps (accounts, products, sales, wastage, reports, core)
- [x] PostgreSQL database schema with optimized models
- [x] JWT authentication with SimpleJWT
- [x] Role-based access control (Admin, Manager, Salesperson)
- [x] Complete REST API endpoints matching frontend needs
- [x] Real-time analytics and reporting
- [x] Docker configuration for easy deployment
- [x] Comprehensive error handling
- [x] Database seeding with demo data
- [x] Admin interface with Django admin

### Backend Running
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```

Demo Credentials:
- admin@bakery.com / demo1234
- manager@bakery.com / demo1234
- sales@bakery.com / demo1234

Access: http://localhost:8000

## Frontend Integration Steps

### 1. Update Authentication (src/lib/auth.tsx)
- Replace mock auth with JWT-based authentication
- Use the implementation in `src/lib/auth-backend.tsx`
- Install dependencies: `npm install axios js-cookie`

### 2. Update API Service (src/lib/api.ts)
- Replace mock API calls with real backend endpoints
- Use the implementation in `src/lib/api-backend.ts`
- Ensure all API calls use proper formatting

### 3. Environment Configuration
Create `.env.local` in frontend root:
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_JWT_STORAGE_KEY=bakery_auth_v2
```

### 4. Update React Query Hooks
- Ensure all `useQuery` and `useMutation` hooks point to new API
- Update request/response data transformations
- Handle API errors with backend error format

### 5. Start Both Services
```bash
# Terminal 1 - Frontend
cd bakehouse-hq
npm install
npm run dev

# Terminal 2 - Backend  
cd backend
source venv/bin/activate
python manage.py runserver
```

Access: http://localhost:5173

## API Endpoints Available

### Authentication
- POST /api/v1/auth/login/
- POST /api/v1/auth/refresh/
- POST /api/v1/auth/logout/
- GET /api/v1/auth/me/

### Sales
- GET /api/v1/sales/
- POST /api/v1/sales/
- GET /api/v1/sales/today/
- GET /api/v1/sales/summary/
- POST /api/v1/sales/{id}/void/

### Wastage
- GET /api/v1/wastage/
- POST /api/v1/wastage/
- GET /api/v1/wastage/today/
- GET /api/v1/wastage/summary/
- POST /api/v1/wastage/{id}/approve/

### Products
- GET /api/v1/products/
- POST /api/v1/products/
- PUT /api/v1/products/{id}/update_stock/
- GET /api/v1/products/low_stock/
- GET /api/v1/products/out_of_stock/

### Users
- GET /api/v1/users/
- POST /api/v1/users/
- PUT /api/v1/users/{id}/
- DELETE /api/v1/users/{id}/
- POST /api/v1/users/{id}/toggle_status/

### Reports
- GET /api/v1/reports/dashboard/
- GET /api/v1/reports/sales/
- GET /api/v1/reports/wastage/

## Key Features Implemented

✓ Production-grade Django backend
✓ Complete API with 30+ endpoints
✓ JWT authentication with token refresh
✓ Role-based permissions (3 roles)
✓ Real-time analytics and dashboards
✓ Complete CRUD operations for all modules
✓ Error handling and validation
✓ Database indexing for performance
✓ Docker & Docker Compose setup
✓ Seed data with demo accounts
✓ Admin interface
✓ API documentation (Swagger/ReDoc)

## Next Steps

1. Copy the updated auth file:
   - `src/lib/auth-backend.tsx` → `src/lib/auth.tsx`

2. Copy the updated API file:
   - `src/lib/api-backend.ts` → `src/lib/api.ts`

3. Update environment configuration

4. Test login with demo credentials

5. Verify all operations (sales, wastage, reports)

6. Deploy to production when ready

## Troubleshooting

### Backend won't start
- Check Python version (3.9+)
- Ensure PostgreSQL is running (or use SQLite for dev)
- Verify all dependencies installed: `pip install -r requirements.txt`

### Frontend can't connect to backend
- Check CORS settings in backend
- Verify backend is running on http://localhost:8000
- Check network tab in browser dev tools

### JWT token issues
- Clear browser localStorage
- Ensure token refresh endpoint is working
- Check token expiration settings in .env

### Database errors
- Run migrations: `python manage.py migrate`
- Seed data: `python manage.py seed_data`
- Check PostgreSQL connection

## Production Deployment

1. Set ENVIRONMENT=production in .env
2. Configure PostgreSQL 15+
3. Set up Redis for caching
4. Use strong SECRET_KEY
5. Enable HTTPS
6. Configure CORS for your domain
7. Set up logging and monitoring
8. Use Gunicorn + Nginx
9. Configure database backups
10. Set up CI/CD pipeline

See backend/README.md for detailed production setup.
