const express = require('express');
const router = express.Router();
const { generateToken } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * 
 * This is a DEMO endpoint for testing JWT generation.
 * In production, this should:
 * 1. Verify username/password against your user database
 * 2. Use proper password hashing (bcrypt)
 * 3. Implement rate limiting
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }

    // DEMO: Hardcoded users for testing
    // In production, query your database and verify hashed password
    const demoUsers = [
      { id: 1, email: 'user@columbia.edu', password: 'password123', role: 'user' },
      { id: 2, email: 'admin@columbia.edu', password: 'admin123', role: 'admin' },
    ];

    const user = demoUsers.find(u => u.email === email && u.password === password);

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      // Tell client how to use the token
      usage: {
        header: 'Authorization',
        format: `Bearer ${token}`
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error.message
    });
  }
});

/**
 * POST /api/auth/verify
 * 
 * Verify if a token is valid
 */
router.post('/verify', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      error: 'No token provided'
    });
  }

  try {
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../middleware/auth');
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    res.json({
      valid: true,
      user: decoded
    });
  } catch (error) {
    res.status(401).json({
      valid: false,
      error: error.message
    });
  }
});

/**
 * GET /api/auth/me
 * 
 * Get current user info (protected route example)
 */
router.get('/me', require('../middleware/auth').verifyToken, (req, res) => {
  res.json({
    user: req.user,
    message: 'You are authenticated!'
  });
});

module.exports = router;