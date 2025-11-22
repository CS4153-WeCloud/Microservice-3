require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const notificationRoutes = require('./routes/notificationRoutes');
const emailRoutes = require('./routes/emailRoutes');
const smsRoutes = require('./routes/smsRoutes');

const subscriptionRoutes = require('./routes/subscriptionRoutes');
const tripRoutes = require('./routes/tripRoutes');

const app = express();
const PORT = process.env.PORT || 3003;

// Load OpenAPI spec
const swaggerDocument = YAML.load(path.join(__dirname, '../api/openapi.yaml'));

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'notification-service',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/notifications', notificationRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/sms', smsRoutes);

app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api', tripRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Notification Service API',
    version: '1.0.0',
    documentation: '/api-docs',
    apiSpec: '/api-docs'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
  console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
  console.log(`OpenAPI spec loaded from api/openapi.yaml`);
});

module.exports = app;