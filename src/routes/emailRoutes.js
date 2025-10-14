const express = require('express');
const router = express.Router();

// POST /api/email/send - Send email (NOT IMPLEMENTED)
router.post('/send', (req, res) => {
  res.status(501).json({ 
    error: 'NOT_IMPLEMENTED',
    message: 'Email sending is not yet implemented. Consider using /api/notifications with type=email'
  });
});

module.exports = router;

