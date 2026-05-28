# Bakery HQ - Complete System Architecture

## Overview

Bakery HQ is a production-grade, fullstack bakery outlet management system built with:
- **Frontend**: React, TypeScript, Vite, TailwindCSS, shadcn/ui, React Query, React Router
- **Backend**: Django, Django REST Framework, PostgreSQL, Redis, Celery
- **Deployment**: Docker, Docker Compose, Gunicorn, Nginx-ready

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER INTERFACE LAYER                        │
│                    React + TypeScript Frontend                   │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│  Dashboard   │   Sales      │   Wastage    │   Reports &        │
│  (Analytics) │  (Entry)     │  (Tracking)  │   Analytics        │
│              │              │              │                    │
└──────────────┴──────────────┴──────────────┴────────────────────┘
                              │
                              ↓
                    ┌──────────────────────┐
                    │  JWT Authentication  │
                    │  (Access + Refresh)  │
                    └──────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       API GATEWAY LAYER                          │
│                    Django REST Framework                         │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│ Auth (5)     │ Products (4) │ Sales (7)    │ Wastage (6)        │
│ Users (6)    │              │              │ Reports (3)        │
└──────────────┴──────────────┴──────────────┴────────────────────┘
     │              │              │              │
     ├──────────────┴──────────────┴──────────────┤
     │                                            │
     ↓                                            ↓
┌────────────────────────┐         ┌──────────────────────────┐
│  BUSINESS LOGIC LAYER  │         │  CACHE & ASYNC LAYER    │
│  (Serializers, Views,  │         │  (Redis + Celery)       │
│   Permissions)         │         └──────────────────────────┘
└────────────────────────┘
     │
     ↓
┌─────────────────────────────────────────────────────────────────┐
│                       DATA ACCESS LAYER                          │
│                     Django ORM Models                            │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│ User Model   │ Product      │ Sale Model   │ Wastage Model      │
│ (9 fields)   │ Model (10)   │ (11 fields) │ (10 fields)        │
│              │              │              │                    │
└──────────────┴──────────────┴──────────────┴────────────────────┘
     │
     ↓
┌─────────────────────────────────────────────────────────────────┐
│                     PERSISTENCE LAYER                            │
│                    PostgreSQL Database                           │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│ accounts_*   │ products_*   │ sales_*      │ wastage_*          │
│ 1 table      │ 3 tables     │ 2 tables     │ 1 table            │
└──────────────┴──────────────┴──────────────┴────────────────────┘
```

## Database Schema

### Core Models

#### User (accounts_user)
```
- id: BigAutoField (PK)
- email: EmailField (Unique, Indexed)
- name: CharField(255)
- role: Enum(admin, manager, salesperson)
- status: Enum(active, disabled)
- avatar: URLField (nullable)
- phone: CharField(20)
- department: CharField(100)
- is_active: BooleanField
- is_staff: BooleanField
- is_superuser: BooleanField
- last_login: DateTimeField
- last_logout: DateTimeField
- created_at: DateTimeField (auto_now_add, indexed)
- updated_at: DateTimeField (auto_now)
```

#### ProductCategory (products_category)
```
- id: BigAutoField (PK)
- name: CharField(100, unique)
- description: TextField
- display_order: IntegerField
- created_at: DateTimeField
- updated_at: DateTimeField
```

#### Product (products_product)
```
- id: BigAutoField (PK)
- name: CharField(255, indexed)
- category: ForeignKey → ProductCategory
- price: DecimalField(10,2, non-negative)
- stock: IntegerField (indexed, non-negative)
- min_stock: IntegerField
- sku: CharField(50, unique, nullable)
- barcode: CharField(50, unique, nullable)
- description: TextField
- image_url: URLField
- is_active: BooleanField (indexed)
- last_stock_check: DateTimeField
- total_sold: IntegerField
- total_wasted: IntegerField
- created_at: DateTimeField (indexed)
- updated_at: DateTimeField
- Indexes: (category, is_active), (stock), (sku)
```

#### Sale (sales_sale)
```
- id: BigAutoField (PK)
- date: DateField (indexed)
- reference_number: CharField(50, unique)
- cashier: ForeignKey → User
- subtotal: DecimalField(12,2)
- tax_amount: DecimalField(12,2)
- discount_amount: DecimalField(12,2)
- total: DecimalField(12,2, indexed)
- payment_method: Enum(cash, card, check, online, other)
- is_void: BooleanField
- void_reason: TextField
- void_by: ForeignKey → User (nullable)
- void_at: DateTimeField
- notes: TextField
- created_by: ForeignKey → User (nullable)
- updated_by: ForeignKey → User (nullable)
- created_at: DateTimeField (indexed)
- updated_at: DateTimeField
- Indexes: (date), (cashier, date), (is_void)
```

#### SaleItem (sales_item)
```
- id: BigAutoField (PK)
- sale: ForeignKey → Sale
- product: ForeignKey → Product
- quantity: IntegerField (positive)
- unit_price: DecimalField(12,2)
- discount_amount: DecimalField(12,2)
- line_total: DecimalField(12,2)
- created_at: DateTimeField
- updated_at: DateTimeField
- Indexes: (sale), (product)
```

#### Wastage (wastage_wastage)
```
- id: BigAutoField (PK)
- date: DateField (indexed)
- reference_number: CharField(50, unique)
- product: ForeignKey → Product
- quantity: IntegerField (positive)
- reason: Enum(expired, damaged, returned, overproduction, quality_issue, other)
- unit_cost: DecimalField(12,2)
- loss: DecimalField(12,2, indexed)
- recorded_by: ForeignKey → User
- notes: TextField
- is_approved: BooleanField (indexed)
- approved_by: ForeignKey → User (nullable)
- approved_at: DateTimeField
- created_by: ForeignKey → User (nullable)
- updated_by: ForeignKey → User (nullable)
- created_at: DateTimeField (indexed)
- updated_at: DateTimeField
- Indexes: (date), (product, date), (reason), (is_approved)
```

#### StockAdjustment (products_stock_adjustment)
```
- id: BigAutoField (PK)
- product: ForeignKey → Product
- quantity: IntegerField (can be negative)
- reason: Enum(sale, wastage, stock_count, manual_adjustment, stock_in, stock_return)
- old_stock: IntegerField
- new_stock: IntegerField
- notes: TextField
- sale: ForeignKey → Sale (nullable)
- wastage: ForeignKey → Wastage (nullable)
- adjusted_by: ForeignKey → User
- created_at: DateTimeField (indexed)
- Indexes: (product, created_at), (reason)
```

## API Endpoint Reference

### Authentication (5 endpoints)
1. POST `/auth/login/` - User login
2. POST `/auth/refresh/` - Refresh JWT token
3. POST `/auth/logout/` - User logout
4. GET `/auth/me/` - Get current user
5. POST `/auth/health/` - Health check

### Products (4 endpoints)
1. GET `/products/` - List products
2. POST `/products/` - Create product (admin)
3. PUT `/products/{id}/update_stock/` - Update stock
4. GET `/products/low_stock/` - List low stock
5. GET `/products/out_of_stock/` - List out of stock

### Sales (7 endpoints)
1. GET `/sales/` - List sales
2. POST `/sales/` - Create sale
3. GET `/sales/{id}/` - Get sale details
4. GET `/sales/today/` - Today's sales
5. GET `/sales/summary/` - Sales summary
6. POST `/sales/{id}/void/` - Void sale
7. PUT `/sales/{id}/` - Update sale

### Wastage (6 endpoints)
1. GET `/wastage/` - List wastage
2. POST `/wastage/` - Record wastage
3. GET `/wastage/{id}/` - Get wastage details
4. GET `/wastage/today/` - Today's wastage
5. GET `/wastage/summary/` - Wastage summary
6. POST `/wastage/{id}/approve/` - Approve wastage

### Users (6 endpoints)
1. GET `/users/` - List users (admin)
2. POST `/users/` - Create user (admin)
3. GET `/users/{id}/` - Get user details
4. PUT `/users/{id}/` - Update user (admin)
5. DELETE `/users/{id}/` - Delete user (admin)
6. POST `/users/{id}/toggle_status/` - Toggle user status

### Reports (3 endpoints)
1. GET `/reports/dashboard/` - Dashboard analytics
2. GET `/reports/sales/` - Sales report
3. GET `/reports/wastage/` - Wastage report

## Authentication Flow

```
┌────────────────┐
│   Frontend     │
│   Login Form   │
└────────┬───────┘
         │ POST /auth/login/
         │ {email, password}
         ↓
┌──────────────────────────────────┐
│    Django Backend                │
│  1. Validate credentials        │
│  2. Check user status (active)  │
│  3. Generate JWT tokens        │
│  4. Update last_login          │
└────────┬────────────────────────┘
         │ Response: {access, refresh, user}
         ↓
┌─────────────────────────────────────┐
│   Frontend Storage               │
│  - Store access token           │
│  - Store refresh token          │
│  - Store user info              │
│  - Set expiration time          │
└─────────────────────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│  Subsequent API Requests     │
│  Header: Bearer {access}     │
└──────────────────────────────┘
         │
         ↓ (if expired)
┌──────────────────────────────┐
│ POST /auth/refresh/          │
│ {refresh}                    │
└──────────────┬───────────────┘
              │
              ↓ New access token
         Continue request
```

## Role-Based Access Control

### Admin (Full Access)
- Create/manage all users
- View all sales and wastage
- Create/update/delete products
- Manage system settings
- Approve wastage records
- Access all reports

### Manager (Operational Management)
- View all sales and wastage
- Approve wastage records
- Generate reports
- View analytics
- Cannot manage users or products

### Salesperson (Operational Only)
- Create sales
- Record wastage
- Update stock counts
- View own sales/wastage
- Cannot approve or view manager data

## Performance Optimizations

1. **Database**
   - Strategic indexes on frequently queried fields
   - Atomic transactions for data consistency
   - Connection pooling
   - Query optimization with select_related/prefetch_related

2. **API**
   - Pagination (50 items per page)
   - Filtering and searching
   - Caching with Redis
   - Async tasks with Celery

3. **Frontend**
   - React Query for efficient data fetching
   - Component lazy loading
   - Code splitting with Vite
   - CSS optimization with TailwindCSS

## Error Handling

All API responses follow consistent format:

**Success:**
```json
{
  "success": true,
  "data": {...},
  "message": "Operation successful"
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "message": "Descriptive error message",
    "code": "ErrorCode"
  }
}
```

## Deployment Architecture

```
                    ┌─────────────┐
                    │   Client    │
                    │  (Browser)  │
                    └──────┬──────┘
                           │ HTTPS
                           ↓
                    ┌─────────────┐
                    │    Nginx    │
                    │  (Reverse   │
                    │   Proxy)    │
                    └──────┬──────┘
                           │ HTTP
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ↓                  ↓                  ↓
    ┌────────┐        ┌────────┐        ┌────────┐
    │ Django │        │ Django │        │ Django │
    │ App 1  │        │ App 2  │        │ App 3  │
    │(Port   │        │(Port   │        │(Port   │
    │ 8001)  │        │ 8002)  │        │ 8003)  │
    └────┬───┘        └────┬───┘        └────┬───┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                    ┌──────↓──────┐
                    │ PostgreSQL  │
                    │ (Primary    │
                    │  Database)  │
                    └─────────────┘
                    
                    ┌──────────────┐
                    │    Redis     │
                    │ (Cache &     │
                    │  Celery)     │
                    └──────────────┘

Celery Workers:
┌───────────┐  ┌───────────┐
│ Worker 1  │  │ Worker 2  │
│(Async     │  │(Async     │
│Tasks)     │  │Tasks)     │
└───────────┘  └───────────┘
```

## Development Workflow

1. **Local Development**
   - Run frontend with `npm run dev`
   - Run backend with `python manage.py runserver`
   - Use mock data or seed data
   - Test with demo credentials

2. **Testing**
   - Unit tests with pytest
   - Integration tests
   - API testing
   - Frontend component tests

3. **Staging**
   - Docker Compose setup
   - Full feature testing
   - Load testing
   - Security audits

4. **Production**
   - Docker containerization
   - Database backups
   - Monitoring and logging
   - CI/CD pipeline
   - Disaster recovery

## Project Statistics

- **Frontend**: ~500 lines of React code + components
- **Backend**: ~2,000+ lines of Python code
- **API Endpoints**: 31 total endpoints
- **Database Tables**: 8 main tables + 1 audit table
- **Models**: 8 Django models
- **Serializers**: 15+ serializers
- **ViewSets**: 6 viewsets
- **Docker Containers**: 5 (frontend dev, backend, db, redis, celery)

## Key Achievements

✓ Production-ready Django backend
✓ Fully functional REST API
✓ Role-based access control
✓ Real-time analytics
✓ Docker containerization
✓ Complete API documentation
✓ Database optimization
✓ Comprehensive error handling
✓ Security best practices
✓ Scalable architecture

## Future Enhancements

- [ ] Email notifications
- [ ] SMS alerts for low stock
- [ ] PDF/CSV exports
- [ ] Mobile app (React Native/Flutter)
- [ ] Advanced analytics (ML predictions)
- [ ] Multi-outlet support
- [ ] Payment gateway integration
- [ ] Inventory forecasting
- [ ] Customer loyalty program
- [ ] POS hardware integration
