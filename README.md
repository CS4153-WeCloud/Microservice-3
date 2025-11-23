# Subscription & Trip Management Service

A RESTful microservice for subscription and trip management using **Swagger API-First Design**. The API specification is defined first in OpenAPI 3.0 YAML format, then implemented.

## Demo Video
Sprint 1: https://youtu.be/2c6s3ev0MNU
Sprint 2: https://youtu.be/TI6YJAPA0qo

## Features

- ✅ **API-First Design** - OpenAPI spec defined before implementation
- ✅ Complete REST API endpoints (GET, POST, PUT, DELETE)
- ✅ Swagger UI for interactive API documentation
- ✅ Subscription management
- ✅ Trip management and tracking
- ✅ MySQL database integration
- ✅ Health check endpoint
- ✅ Ready for GCP VM deployment

## Tech Stack

- Node.js + Express
- OpenAPI 3.0 (YAML specification)
- Swagger UI
- MySQL database
- PM2 process management

## API-First Approach

This service follows the **API-First** development methodology:

1. **Design** - API specification defined in `api/openapi.yaml`
2. **Review** - Team reviews the API contract
3. **Implement** - Routes and handlers implement the spec
4. **Test** - Validate implementation against spec

The OpenAPI spec serves as the source of truth for the API contract.

## Quick Start

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp env.example .env
```

3. Start the server:
```bash
npm run dev
```

4. Access the API:
   - API Base: http://localhost:3003
   - API Documentation: http://localhost:3003/api-docs
   - Health Check: http://localhost:3003/health

## API Endpoints

### Subscription Endpoints

✅ **Fully Implemented:**
- `GET /api/subscriptions` - Get all subscriptions
- `GET /api/subscriptions/:id` - Get subscription by ID
- `POST /api/subscriptions` - Create subscription
- `PUT /api/subscriptions/:id` - Update subscription
- `DELETE /api/subscriptions/:id` - Delete subscription

### Trip Endpoints

✅ **Fully Implemented:**
- `GET /api/trips` - Get all trips
- `GET /api/trips/:id` - Get trip by ID
- `POST /api/trips` - Create trip
- `PUT /api/trips/:id` - Update trip
- `DELETE /api/trips/:id` - Delete trip

### Legacy Notification Endpoints

⚠️ **Partially Implemented:**
- `GET /api/notifications` - Get all notifications
- `GET /api/notifications/:id` - Get notification by ID
- `POST /api/notifications` - Create notification

⚠️ **Not Yet Implemented (return 501):**
- `POST /api/email/send` - Send email directly
- `POST /api/sms/send` - Send SMS directly


## Project Structure

```
microservice-3-subscription/
├── api/
│   └── openapi.yaml              # OpenAPI 3.0 specification (API-First)
├── src/
│   ├── routes/
│   │   ├── subscriptionRoutes.js # Subscription endpoints
│   │   ├── tripRoutes.js         # Trip endpoints
│   │   ├── notificationRoutes.js # Legacy notification endpoints
│   │   ├── emailRoutes.js        # Email endpoints (501)
│   │   └── smsRoutes.js          # SMS endpoints (501)
│   ├── db.js                     # Database connection
│   └── server.js                 # Express app entry point
├── env.example
├── package.json
├── Dockerfile
└── README.md
```

## Database Schema

### Subscriptions Table

```sql
CREATE TABLE subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  tier ENUM('basic', 'premium', 'enterprise') NOT NULL,
  status ENUM('active', 'inactive', 'cancelled') NOT NULL,
  startDate DATE NOT NULL,
  endDate DATE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Trips Table

```sql
CREATE TABLE trips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  origin VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  departureDate DATE NOT NULL,
  returnDate DATE,
  status ENUM('planned', 'confirmed', 'in_progress', 'completed', 'cancelled') NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Network Architecture

```
┌──────────────────────────────────────────────────┐
│              GCP VPC (Internal Network)          │
│                                                  │
│  ┌────────────────────┐    ┌──────────────────┐  │
│  │  Subscription VM   │◄───┤   local          │  │
│  │  Port: 3003        │    │                  │  │
│  │  10.128.0.3        │    │                  │  │
│  └─────────┬──────────┘    └──────────────────┘  │
│            │                                     │
│            │ Internal Network                    │
│            │ (10.128.0.0/20)                     │
│            ▼                                     │
│  ┌────────────────────────────────────────────┐  │
│  │           MySQL VM                         │  │
│  │           Port: 3306                       │  │
│  │           10.128.0.4                       │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```
