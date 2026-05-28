# Bakery HQ Backend - Production-Grade Bakery Management System

## Overview

Complete Django REST API backend for Bakery HQ, a comprehensive bakery outlet management system with sales tracking, wastage management, inventory control, and analytics.

## Technology Stack

- **Python 3.11**
- **Django 4.2**
- **Django REST Framework**
- **PostgreSQL**
- **Redis + Celery**
- **Docker & Docker Compose**
- **Gunicorn + Nginx**
- **JWT Authentication (SimpleJWT)**

## Features

### Core Modules

1. **Authentication & User Management**
   - JWT-based authentication with refresh tokens
   - Role-based access control (Admin, Manager, Salesperson)
   - User status management (Active/Disabled)

2. **Products & Inventory**
   - Product catalog with categories
   - Real-time stock tracking
   - Low stock alerts
   - Stock adjustment audit trail

3. **Sales Management**
   - Fast sales entry optimized for cashiers
   - Multiple payment methods
   - Sale voiding with reasons
   - Transaction history

4. **Wastage Tracking**
   - Wastage recording with reasons (Expired, Damaged, Returned, Overproduction)
   - Loss calculation and tracking
   - Wastage approval workflow
   - Historical analysis

5. **Reports & Analytics**
   - Real-time dashboard with KPIs
   - Sales trends and breakdowns
   - Wastage analysis by product and reason
   - Period-over-period comparisons
   - Top-selling products analysis

### API Endpoints

#### Authentication
- `POST /api/v1/auth/login/` - User login
- `POST /api/v1/auth/refresh/` - Refresh JWT token
- `POST /api/v1/auth/logout/` - User logout
- `GET /api/v1/auth/me/` - Get current user info

#### Products
- `GET /api/v1/products/` - List products
- `POST /api/v1/products/` - Create product (admin only)
- `PUT /api/v1/products/{id}/update_stock/` - Update stock

#### Sales
- `GET /api/v1/sales/` - List sales
- `POST /api/v1/sales/` - Create sale
- `GET /api/v1/sales/today/` - Today's sales
- `POST /api/v1/sales/{id}/void/` - Void sale (manager+)

#### Wastage
- `GET /api/v1/wastage/` - List wastage
- `POST /api/v1/wastage/` - Record wastage
- `POST /api/v1/wastage/{id}/approve/` - Approve wastage (manager+)

#### Reports
- `GET /api/v1/reports/dashboard/` - Dashboard analytics
- `GET /api/v1/reports/sales/` - Sales report with filtering
- `GET /api/v1/reports/wastage/` - Wastage report with filtering

#### Users
- `GET /api/v1/users/` - List users (admin only)
- `POST /api/v1/users/` - Create user (admin only)
- `PUT /api/v1/users/{id}/` - Update user (admin only)
- `POST /api/v1/users/{id}/toggle_status/` - Enable/disable user

## Installation

### Local Development

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create .env file**
   ```bash
   cp .env.example .env
   ```

5. **Run migrations**
   ```bash
   python manage.py migrate
   ```

6. **Seed initial data**
   ```bash
   python manage.py seed_data
   ```

7. **Create superuser (optional)**
   ```bash
   python manage.py createsuperuser
   ```

8. **Run development server**
   ```bash
   python manage.py runserver
   ```

### Docker Development

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up --build
   ```

2. **Access services**
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/api/schema/swagger/
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379

3. **Run migrations in container**
   ```bash
   docker-compose exec backend python manage.py migrate
   ```

## Demo Credentials

```
Email: admin@bakery.com
Password: demo1234
Role: Admin

Email: manager@bakery.com
Password: demo1234
Role: Manager

Email: sales@bakery.com
Password: demo1234
Role: Salesperson
```

## Project Structure

```
backend/
├── apps/
│   ├── core/                 # Core utilities, permissions, base models
│   ├── accounts/             # User management & authentication
│   ├── products/             # Product catalog & inventory
│   ├── sales/                # Sales transactions
│   ├── wastage/              # Wastage tracking
│   └── reports/              # Analytics & reporting
├── bakery_hq/                # Django project settings
├── tests/                    # Test suite
├── docker/                   # Docker configuration
├── manage.py                 # Django CLI
├── requirements.txt          # Python dependencies
├── docker-compose.yml        # Multi-container orchestration
└── conftest.py              # Pytest configuration
```

## Key Features

### Authentication Flow
1. User submits email + password to `/auth/login/`
2. Backend validates and returns JWT access & refresh tokens
3. Frontend stores tokens in localStorage/secure storage
4. Subsequent requests use Bearer token in Authorization header
5. Tokens auto-refresh using refresh endpoint

### Role-Based Access Control
- **Admin**: Full system access, user management
- **Manager**: View reports, analytics, all transactions
- **Salesperson**: Create sales, record wastage, view own data

### Real-Time Analytics
- Dashboard calculates KPIs on-demand
- Efficient queries using Django aggregations
- Caching layer for performance (via Redis)
- Period-over-period comparisons

### Data Integrity
- Atomic transactions for sales & adjustments
- Stock consistency checks
- Audit trail for all changes
- Soft deletes where appropriate

## Database Schema

### Core Models
- **User** - User accounts with roles
- **Product** - Product catalog
- **ProductCategory** - Product categorization
- **Sale** - Sales transactions
- **SaleItem** - Line items in sales
- **Wastage** - Wastage records
- **StockAdjustment** - Stock change audit trail

## Deployment

### Production Checklist

1. **Environment Setup**
   - Use PostgreSQL 15+ in production
   - Redis for caching and Celery
   - Set ENVIRONMENT=production
   - Configure SECRET_KEY securely

2. **Security**
   - Enable HTTPS/SSL
   - Set DEBUG=False
   - Configure CORS properly
   - Use strong SECRET_KEY

3. **Performance**
   - Use Gunicorn with multiple workers
   - Set up Nginx reverse proxy
   - Configure database connection pooling
   - Enable Redis caching

4. **Monitoring**
   - Set up logging to CloudWatch/ELK
   - Configure error tracking (Sentry)
   - Monitor Celery tasks
   - Database backups (automated)

### Docker Production

```bash
# Build production image
docker build -f docker/Dockerfile -t bakery-hq:latest .

# Run with production settings
docker run -e ENVIRONMENT=production \
           -e DEBUG=False \
           -e SECRET_KEY=your-secret-key \
           -p 8000:8000 \
           bakery-hq:latest
```

## API Response Format

All API responses follow a consistent format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ErrorCode"
  }
}
```

## Testing

Run test suite:
```bash
pytest                          # Run all tests
pytest tests/test_auth.py       # Run specific test file
pytest -v                       # Verbose output
pytest --cov                    # With coverage report
```

## API Documentation

Interactive API documentation available at:
- Swagger UI: `/api/schema/swagger/`
- ReDoc: `/api/schema/redoc/`

## Performance Optimizations

- Database query optimization with select_related/prefetch_related
- Pagination (50 items per page by default)
- Filtering, searching, and ordering support
- Redis caching for frequently accessed data
- Async tasks via Celery for heavy operations

## Contributing

1. Follow PEP 8 style guide
2. Write tests for new features
3. Document API endpoints
4. Use type hints where applicable

## Support

For issues and support, contact: support@bakery.com

## License

Proprietary - Bakery HQ
