const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

/**
 * Generate JWT Token
 * Called after successful login
 */
function generateToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role || 'user',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
    issuer: 'microservice-3-subscription',
  });
}

/**
 * Verify JWT Token Middleware
 * Use this on protected routes
 */
function verifyToken(req, res, next) {
  try {
    // Get token from header
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No authorization header provided'
      });
    }

    // Expected format: "Bearer <token>"
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        error: 'Invalid authorization format',
        message: 'Format should be: Bearer <token>'
      });
    }

    const token = parts[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please log in again'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Authentication failed'
      });
    }

    return res.status(500).json({
      error: 'Authentication error',
      message: error.message
    });
  }
}

/**
 * Optional: Check if user owns the resource
 */
function verifyOwnership(req, res, next) {
  const resourceUserId = parseInt(req.params.userId || req.query.userId || req.body.userId);
  const authenticatedUserId = req.user.userId;

  if (req.user.role === 'admin') {
    return next();
  }

  if (resourceUserId && resourceUserId !== authenticatedUserId) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You can only access your own resources'
    });
  }

  next();
}

/**
 * Optional: Admin only middleware
 */
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin access required'
    });
  }
  next();
}

module.exports = {
  generateToken,
  verifyToken,
  verifyOwnership,
  requireAdmin,
  JWT_SECRET
};