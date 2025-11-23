# Subscription & Trip Management Service

A RESTful microservice for subscription and trip management using **Swagger API-First Design**. The API specification is defined first in OpenAPI 3.0 YAML format, then implemented.

## Demo Video
Access this URL: https://youtu.be/2c6s3ev0MNU

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

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3003 |
| NODE_ENV | Environment | development |
| DB_HOST | MySQL host (internal IP) | localhost |
| DB_USER | MySQL user | appuser |
| DB_PASSWORD | MySQL password | - |
| DB_NAME | Database name | subscription_service_db |
| DB_PORT | MySQL port | 3306 |

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

## Development Workflow

### API-First Development Process:

1. **Update OpenAPI Spec** (`api/openapi.yaml`)
   - Define new endpoints
   - Specify request/response schemas
   - Document parameters and responses

2. **Review Specification**
   - Team reviews via Swagger UI
   - Validate API design
   - Gather feedback

3. **Implement Routes**
   - Create/update route handlers
   - Follow the spec exactly
   - Return proper status codes

4. **Test Against Spec**
   - Verify implementation matches spec
   - Test all response codes
   - Validate data schemas

## Sample Data

The service connects to MySQL database with proper schema. Ensure you:
1. Have MySQL VM running with internal IP
2. Database schemas are loaded
3. Proper firewall rules are configured for internal communication

## Future Enhancements

- [ ] Add subscription payment integration
- [ ] Implement trip booking system
- [ ] Add notification templates
- [ ] Add scheduling capabilities for trips
- [ ] Implement subscription auto-renewal
- [ ] Add analytics and reporting
- [ ] Add webhooks for status changes
- [ ] Implement batch operations
- [ ] Add rate limiting
- [ ] Integrate with payment gateway
- [ ] Add trip recommendations based on subscription tier

## Development Team Notes

- This service follows API-First design - always update `openapi.yaml` first
- All endpoints return consistent error formats
- Database uses MySQL with proper connection pooling
- Internal VPC communication via private IPs only
- Use IAP tunnels for local development and testing
- Service integrates with User and Order services via internal network
- Subscription tiers can be extended for additional features

## Integration Examples

### User Service Integration

When a new user registers, create a basic subscription:

```javascript
// In User Service
const axios = require('axios');

async function createUserSubscription(user) {
  await axios.post('http://10.128.0.5:3003/api/subscriptions', {
    userId: user.id,
    tier: 'basic',
    status: 'active',
    startDate: new Date().toISOString().split('T')[0]
  });
}
```

### Order Service Integration

When booking is confirmed, create a trip:

```javascript
// In Order Service
async function createTrip(booking) {
  await axios.post('http://10.128.0.5:3003/api/trips', {
    userId: booking.userId,
    origin: booking.origin,
    destination: booking.destination,
    departureDate: booking.departureDate,
    returnDate: booking.returnDate,
    status: 'confirmed'
  });
}
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
