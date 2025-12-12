const mysql = require('mysql2/promise');
const path = require('path');

// Database configuration
// Supports both local development, Cloud SQL (Unix Socket), and VM MySQL connections
let dbConfig = {
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ms3_database',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Determine connection type based on environment
const isProduction = process.env.NODE_ENV === 'production';

if (process.env.INSTANCE_CONNECTION_NAME && process.env.DB_SOCKET_PATH) {
  // Cloud SQL connection via Unix socket (recommended for Cloud Run)
  // Format: /cloudsql/PROJECT_ID:REGION:INSTANCE_NAME
  dbConfig.socketPath = path.join(process.env.DB_SOCKET_PATH, process.env.INSTANCE_CONNECTION_NAME);
  console.log('🔌 Using Unix socket connection to Cloud SQL:', dbConfig.socketPath);
} else if (process.env.INSTANCE_CONNECTION_NAME) {
  // Cloud SQL with just instance name (auto socket path)
  dbConfig.socketPath = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
  console.log('🔌 Using Cloud SQL Unix socket:', dbConfig.socketPath);
} else {
  // Local development or VM MySQL - use host and port (TCP/IP)
  dbConfig.host = process.env.DB_HOST || 'localhost';
  dbConfig.port = parseInt(process.env.DB_PORT) || 3306;
  console.log('🔌 Using TCP/IP MySQL connection:', `${dbConfig.host}:${dbConfig.port}`);
}

// SSL configuration for Cloud SQL (if certificates are provided)
if (process.env.DB_ROOT_CERT && process.env.DB_CERT && process.env.DB_KEY) {
  const fs = require('fs');
  dbConfig.ssl = {
    ca: fs.readFileSync(process.env.DB_ROOT_CERT),
    cert: fs.readFileSync(process.env.DB_CERT),
    key: fs.readFileSync(process.env.DB_KEY)
  };
  console.log('🔒 SSL/TLS certificates configured');
}

// Create connection pool
let pool = null;

async function getPool() {
  if (!pool) {
    try {
      pool = mysql.createPool(dbConfig);
      
      // Test connection
      const connection = await pool.getConnection();
      console.log('✅ Database connected successfully');
      if (dbConfig.socketPath) {
        console.log('📍 Cloud SQL Socket:', dbConfig.socketPath);
      } else {
        console.log('📍 Host:', dbConfig.host);
      }
      console.log('📊 Database:', dbConfig.database);
      connection.release();
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      console.error('Configuration:', {
        host: dbConfig.host,
        socketPath: dbConfig.socketPath,
        user: dbConfig.user,
        database: dbConfig.database,
        port: dbConfig.port
      });
      throw error;
    }
  }
  return pool;
}

async function query(sql, params) {
  const pool = await getPool();
  return pool.execute(sql, params);
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database connection pool closed');
  }
}

module.exports = {
  getPool,
  query,
  closePool
};
