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

app.get('/api/db-test', async (req, res) => {
  try {
    const db = require('./db');
    const [rows] = await db.query('SELECT DATABASE() as current_db, USER() as current_user, NOW() as current_time');
    res.json({
      status: 'Database connection successful',
      connection: {
        database: rows[0].current_db,
        user: rows[0].current_user,
        timestamp: rows[0].current_time,
        host: process.env.DB_HOST
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'Database connection failed',
      error: error.message,
      config: {
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        user: process.env.DB_USER
      }
    });
  }
});

const http = require('http');

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Notification Service running on port ${PORT}`);
  console.log(`Server listening on 0.0.0.0:${PORT} (accepting external connections)`);
  
  // Try to get external IP dynamically
  try {
    const externalIP = await getExternalIP();
    if (externalIP) {
      console.log(`External access: http://${externalIP}:${PORT}/api-docs`);
      console.log(`Health check: http://${externalIP}:${PORT}/health`);
    }
  } catch (error) {
    console.log(`Could not detect external IP: ${error.message}`);
  }
  
  console.log(`OpenAPI spec loaded from api/openapi.yaml`);
});

// Function to get external IP from GCP metadata service
async function getExternalIP() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'metadata.google.internal',
      port: 80,
      path: '/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip',
      method: 'GET',
      headers: {
        'Metadata-Flavor': 'Google'
      },
      timeout: 2000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data.trim());
        } else {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
    
    req.end();
  });
}

module.exports = app;
