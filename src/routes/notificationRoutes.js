const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// In-memory notification storage
let notifications = [];

// Initialize with sample data
function initSampleData() {
  if (notifications.length === 0) {
    notifications.push({
      id: uuidv4(),
      userId: 1,
      type: 'email',
      recipient: 'user@example.com',
      subject: 'Welcome to our platform',
      message: 'Thank you for signing up!',
      status: 'sent',
      metadata: { source: 'registration' },
      sentAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    notifications.push({
      id: uuidv4(),
      userId: 1,
      type: 'sms',
      recipient: '+1234567890',
      subject: null,
      message: 'Your order has been shipped',
      status: 'delivered',
      metadata: { orderId: 'ORD-123' },
      sentAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Sample notification data initialized');
  }
}

initSampleData();

// GET /api/notifications - Get all notifications
router.get('/', (req, res) => {
  try {
    const { userId, type, status } = req.query;
    
    let filtered = notifications;
    
    if (userId) {
      filtered = filtered.filter(n => n.userId === parseInt(userId));
    }
    
    if (type) {
      filtered = filtered.filter(n => n.type === type);
    }
    
    if (status) {
      filtered = filtered.filter(n => n.status === status);
    }
    
    res.json(filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (error) {
    console.error('GET /api/notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications', message: error.message });
  }
});

// GET /api/notifications/:id - Get notification by ID
router.get('/:id', (req, res) => {
  try {
    const notification = notifications.find(n => n.id === req.params.id);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (error) {
    console.error(`GET /api/notifications/${req.params.id} error:`, error);
    res.status(500).json({ error: 'Failed to fetch notification', message: error.message });
  }
});

// POST /api/notifications - Create notification
router.post('/', (req, res) => {
  try {
    const { userId, type, recipient, subject, message, sendImmediately, metadata } = req.body;
    
    // Validation
    if (!userId || !type || !recipient || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, type, recipient, message' 
      });
    }
    
    if (!['email', 'sms', 'push'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be: email, sms, or push' });
    }
    
    const newNotification = {
      id: uuidv4(),
      userId,
      type,
      recipient,
      subject: subject || null,
      message,
      status: sendImmediately ? 'sent' : 'pending',
      metadata: metadata || {},
      sentAt: sendImmediately ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    notifications.push(newNotification);
    res.status(201).json(newNotification);
  } catch (error) {
    console.error('POST /api/notifications error:', error);
    res.status(500).json({ error: 'Failed to create notification', message: error.message });
  }
});

// PUT /api/notifications/:id - Update notification (NOT IMPLEMENTED)
router.put('/:id', (req, res) => {
  res.status(501).json({ 
    error: 'NOT_IMPLEMENTED',
    message: 'This endpoint is not yet implemented'
  });
});

// DELETE /api/notifications/:id - Delete notification (NOT IMPLEMENTED)
router.delete('/:id', (req, res) => {
  res.status(501).json({ 
    error: 'NOT_IMPLEMENTED',
    message: 'This endpoint is not yet implemented'
  });
});

router.post('/:id/resend', (req, res) => {
  const { id } = req.params;
  const n = notifications.find(n => n.id === id);
  if (!n) return res.status(404).json({ error: 'Notification not found' });

  if (!['pending', 'failed'].includes(n.status)) {
    return res.status(400).json({ error: 'Only pending/failed can be resent' });
  }

  n.status = 'sent';
  n.sentAt = new Date().toISOString();
  n.updatedAt = n.sentAt;
  res.json(n);
});

// POST /api/notifications/:id/resend - Resend notification
router.post('/notifications/:id/resend', (req, res) => {
  const { id } = req.params;
  const n = notifications.find(n => n.id === id);
  if (!n) return res.status(404).json({ error: 'Notification not found' });

  // simple policy: only resend pending/failed
  if (!['pending', 'failed'].includes(n.status)) {
    return res.status(400).json({ error: 'Only pending/failed can be resent' });
  }

  // “simulate” sending
  n.status = 'sent';
  n.sentAt = new Date().toISOString();
  n.updatedAt = n.sentAt;

  return res.json(n);
});

module.exports = router;

