const mysql = require('mysql2/promise');

// Database configuration
let dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ms3_database',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
let pool = null;

async function getPool() {
  if (!pool) {
    try {
      pool = mysql.createPool(dbConfig);
      
      // Test connection
      const connection = await pool.getConnection();
      console.log('Database connected successfully');
      console.log('📍 Host:', dbConfig.host);
      console.log('📊 Database:', dbConfig.database);
      connection.release();
    } catch (error) {
      console.error('Database connection failed:', error.message);
      console.error('Configuration:', {
        host: dbConfig.host,
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