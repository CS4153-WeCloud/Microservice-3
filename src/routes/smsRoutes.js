const express = require('express');
const router = express.Router();

// POST /api/sms/send - Send SMS (NOT IMPLEMENTED)
router.post('/send', (req, res) => {
  res.status(501).json({ 
    error: 'NOT_IMPLEMENTED',
    message: 'SMS sending is not yet implemented. Consider using /api/notifications with type=sms'
  });
});

module.exports = router;

