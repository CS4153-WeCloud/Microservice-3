// src/routes/subscriptionRoutes.js
const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { verifyToken, verifyOwnership } = require('../middleware/auth');

const router = express.Router();

function computeEtag(subscription) {
  const payload = JSON.stringify({
    id: subscription.id,
    userId: subscription.userId,
    routeId: subscription.routeId,
    semester: subscription.semester,
    status: subscription.status,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
  });
  return crypto.createHash('md5').update(payload).digest('hex');
}

function addLinks(subscription) {
  return {
    ...subscription,
    _links: {
      self: `/api/subscriptions/${subscription.id}`,
      user: `/api/users/${subscription.userId}`,
      route: `/api/routes/${subscription.routeId}`,
      trips: `/api/trips?subscriptionId=${subscription.id}`,
    },
  };
}

// =============================================
// PUBLIC ROUTES (No authentication required)
// =============================================

// GET /api/subscriptions - List all (could be made protected)
// For now, keeping it public but you can add verifyToken middleware
router.get('/', async (req, res) => {
  try {
    let { userId, routeId, semester, status, page, pageSize } = req.query;

    let sql = 'SELECT * FROM subscriptions WHERE 1=1';
    const params = [];

    if (userId) {
      sql += ' AND userId = ?';
      params.push(userId);
    }
    if (routeId) {
      sql += ' AND routeId = ?';
      params.push(routeId);
    }
    if (semester) {
      sql += ' AND semester = ?';
      params.push(semester);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    const [rows] = await db.query(sql, params);
    const total = rows.length;

    page = parseInt(page || '1', 10);
    pageSize = parseInt(pageSize || String(total || 10), 10);

    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const pagedRows = rows.slice(start, end);

    const items = pagedRows.map((sub) => {
      sub.etag = computeEtag(sub);
      return addLinks(sub);
    });

    const basePath = '/api/subscriptions';
    const links = {
      self: `${basePath}?page=${page}&pageSize=${pageSize}`,
      first: `${basePath}?page=1&pageSize=${pageSize}`,
      last: `${basePath}?page=${pageCount}&pageSize=${pageSize}`,
    };
    if (page > 1) {
      links.prev = `${basePath}?page=${page - 1}&pageSize=${pageSize}`;
    }
    if (page < pageCount) {
      links.next = `${basePath}?page=${page + 1}&pageSize=${pageSize}`;
    }

    res.json({
      data: items,
      page,
      pageSize,
      total,
      _links: links,
      source: 'MySQL Database at ' + process.env.DB_HOST,
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// =============================================
// PROTECTED ROUTES (Authentication required)
// =============================================

// POST /api/subscriptions - Create subscription (PROTECTED)
// User must be authenticated and can only create subscriptions for themselves
router.post('/', verifyToken, async (req, res) => {
  try {
    const { userId, routeId, semester, status = 'active' } = req.body;

    if (!userId || !routeId || !semester) {
      return res.status(400).json({
        error: 'Missing required fields: userId, routeId, semester',
      });
    }

    // Verify user can only create subscription for themselves (unless admin)
    if (req.user.role !== 'admin' && userId !== req.user.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only create subscriptions for yourself'
      });
    }

    const now = new Date();
    const sql = `
      INSERT INTO subscriptions (userId, routeId, semester, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(sql, [userId, routeId, semester, status, now, now]);

    const subscription = {
      id: result.insertId,
      userId,
      routeId,
      semester,
      status,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    subscription.etag = computeEtag(subscription);

    const resourcePath = `/api/subscriptions/${subscription.id}`;

    res
      .status(201)
      .location(resourcePath)
      .json(addLinks(subscription));
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// GET /api/subscriptions/:id - Get specific subscription (PROTECTED)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const sql = 'SELECT * FROM subscriptions WHERE id = ?';
    const [rows] = await db.query(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subscription = rows[0];

    // Verify user can only access their own subscription (unless admin)
    if (req.user.role !== 'admin' && subscription.userId !== req.user.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only access your own subscriptions'
      });
    }

    subscription.etag = computeEtag(subscription);

    res.set('ETag', subscription.etag).json(addLinks(subscription));
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// PUT /api/subscriptions/:id - Update subscription (PROTECTED)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const ifMatch = req.headers['if-match'];

    const selectSql = 'SELECT * FROM subscriptions WHERE id = ?';
    const [rows] = await db.query(selectSql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subscription = rows[0];

    // Verify ownership
    if (req.user.role !== 'admin' && subscription.userId !== req.user.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own subscriptions'
      });
    }

    const currentEtag = computeEtag(subscription);

    if (!ifMatch) {
      return res.status(428).json({
        error: 'Precondition Required: If-Match header is required for updates',
      });
    }

    if (ifMatch !== currentEtag) {
      return res.status(412).json({
        error: 'Precondition Failed: ETag does not match current resource state',
      });
    }

    const { userId, routeId, semester, status } = req.body;

    if (userId !== undefined) subscription.userId = userId;
    if (routeId !== undefined) subscription.routeId = routeId;
    if (semester !== undefined) subscription.semester = semester;
    if (status !== undefined) subscription.status = status;

    subscription.updatedAt = new Date();

    const updateSql = `
      UPDATE subscriptions 
      SET userId = ?, routeId = ?, semester = ?, status = ?, updatedAt = ?
      WHERE id = ?
    `;

    await db.query(updateSql, [
      subscription.userId,
      subscription.routeId,
      subscription.semester,
      subscription.status,
      subscription.updatedAt,
      id,
    ]);

    subscription.updatedAt = subscription.updatedAt.toISOString();
    subscription.etag = computeEtag(subscription);

    res.set('ETag', subscription.etag).json(addLinks(subscription));
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// DELETE /api/subscriptions/:id - Delete subscription (PROTECTED)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // First check if subscription exists and verify ownership
    const selectSql = 'SELECT * FROM subscriptions WHERE id = ?';
    const [rows] = await db.query(selectSql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subscription = rows[0];

    // Verify ownership
    if (req.user.role !== 'admin' && subscription.userId !== req.user.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete your own subscriptions'
      });
    }

    const sql = 'DELETE FROM subscriptions WHERE id = ?';
    const [result] = await db.query(sql, [id]);

    res.status(204).send();
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

module.exports = router;
