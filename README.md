# Notification Service Microservice

A RESTful microservice for notification management using **Swagger API-First Design**. The API specification is defined first in OpenAPI 3.0 YAML format, then implemented.

## Demo Video
Access this URL: https://youtu.be/2c6s3ev0MNU

## Features

- ✅ **API-First Design** - OpenAPI spec defined before implementation
- ✅ Complete REST API endpoints (GET, POST, PUT, DELETE)
- ✅ Swagger UI for interactive API documentation
- ✅ Support for multiple notification types (Email, SMS, Push)
- ✅ In-memory data storage
- ✅ Health check endpoint
- ✅ Ready for GCP VM deployment

## Tech Stack

- Node.js + Express
- OpenAPI 3.0 (YAML specification)
- Swagger UI
- In-memory storage

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

### Implemented Endpoints

✅ **Fully Implemented:**
- `GET /api/notifications` - Get all notifications (with filters)
- `GET /api/notifications/:id` - Get notification by ID
- `POST /api/notifications` - Create notification

⚠️ **Not Yet Implemented (return 501):**
- `PUT /api/notifications/:id` - Update notification
- `DELETE /api/notifications/:id` - Delete notification
- `POST /api/notifications/:id/resend` - Resend notification
- `POST /api/email/send` - Send email directly
- `POST /api/sms/send` - Send SMS directly

### Example Requests

```bash
# Get all notifications
curl http://localhost:3003/api/notifications

# Filter by user
curl http://localhost:3003/api/notifications?userId=1

# Filter by type and status
curl http://localhost:3003/api/notifications?type=email&status=sent

# Create a notification
curl -X POST http://localhost:3003/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "type": "email",
    "recipient": "user@example.com",
    "subject": "Welcome!",
    "message": "Thank you for signing up",
    "sendImmediately": true,
    "metadata": {
      "source": "registration"
    }
  }'

# Get specific notification
curl http://localhost:3003/api/notifications/<notification-id>
```

## OpenAPI Specification

The complete API specification is defined in `api/openapi.yaml`. Key features:

- **Notification Types**: email, sms, push
- **Status States**: pending, sent, failed, delivered
- **Comprehensive schemas** for all request/response types
- **Query parameters** for filtering
- **Error responses** with consistent format

View the spec interactively at: http://localhost:3003/api-docs

## GCP Deployment

### 1. Create a VM Instance

```bash
gcloud compute instances create notification-service-vm \
  --zone=us-central1-a \
  --machine-type=e2-small \
  --image-family=ubuntu-2004-lts \
  --image-project=ubuntu-os-cloud \
  --tags=http-server
```

### 2. Configure Firewall

```bash
gcloud compute firewall-rules create allow-notification-service \
  --allow=tcp:3003 \
  --target-tags=http-server
```

### 3. Deploy Application

```bash
# SSH into VM
gcloud compute ssh notification-service-vm --zone=us-central1-a

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone your repo
git clone <your-repo-url>
cd microservice-3-notification

# Install dependencies
npm install

# Set up environment variables
cp env.example .env

# Start with PM2
sudo npm install -g pm2
pm2 start src/server.js --name notification-service
pm2 save
pm2 startup
```

## Testing

```bash
# Get external IP
gcloud compute instances describe notification-service-vm --zone=us-central1-a --format='get(networkInterfaces[0].accessConfigs[0].natIP)'

# Test the API
curl http://<external-ip>:3003/health
curl http://<external-ip>:3003/api/notifications
```

## Project Structure

```
microservice-3-notification/
├── api/
│   └── openapi.yaml        # OpenAPI 3.0 specification (API-First)
├── src/
│   ├── routes/
│   │   ├── notificationRoutes.js  # Notification endpoints
│   │   ├── emailRoutes.js         # Email endpoints
│   │   └── smsRoutes.js           # SMS endpoints
│   └── server.js           # Express app entry point
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
| SMTP_HOST | Email SMTP host | smtp.gmail.com |
| SMTP_PORT | Email SMTP port | 587 |
| TWILIO_ACCOUNT_SID | Twilio Account SID | - |
| TWILIO_AUTH_TOKEN | Twilio Auth Token | - |

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

The service initializes with 2 sample notifications for testing:
- Email notification (sent)
- SMS notification (delivered)

## Future Enhancements

- [ ] Implement email sending (SMTP integration)
- [ ] Implement SMS sending (Twilio integration)
- [ ] Implement push notifications (FCM/APNS)
- [ ] Add notification templates
- [ ] Add scheduling capabilities
- [ ] Migrate to persistent database
- [ ] Add retry mechanism for failed notifications
- [ ] Add webhooks for delivery status
- [ ] Implement batch sending
- [ ] Add rate limiting

## Development Team Notes

- This service follows API-First design - always update `openapi.yaml` first
- All endpoints return consistent error formats
- NOT_IMPLEMENTED endpoints return 501 status
- In-memory storage resets on restart
- Ready for integration with email/SMS providers
- Can be integrated with User and Order services for automated notifications

## Integration Examples

### Order Service Integration

When an order is created/updated in Order Service:

```javascript
// In Order Service
const axios = require('axios');

async function sendOrderNotification(order) {
  await axios.post('http://notification-service:3003/api/notifications', {
    userId: order.userId,
    type: 'email',
    recipient: order.userEmail,
    subject: 'Order Confirmation',
    message: `Your order ${order.id} has been confirmed`,
    sendImmediately: true,
    metadata: { orderId: order.id }
  });
}
```

### User Service Integration

When a new user registers:

```javascript
// In User Service
async function sendWelcomeEmail(user) {
  await axios.post('http://notification-service:3003/api/notifications', {
    userId: user.id,
    type: 'email',
    recipient: user.email,
    subject: 'Welcome!',
    message: 'Thank you for joining our platform',
    sendImmediately: true
  });
}
```

