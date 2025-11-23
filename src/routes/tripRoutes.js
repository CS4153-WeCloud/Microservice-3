// src/routes/tripRoutes.js
const express = require('express');
const db = require('../db');

const router = express.Router();

let asyncTasks = {};
let nextTaskId = 1;

function addTripLinks(trip) {
  return {
    ...trip,
    _links: {
      self: `/api/trips/${trip.id}`,
      route: `/api/routes/${trip.routeId}`,
      subscription: trip.subscriptionId
        ? `/api/subscriptions/${trip.subscriptionId}`
        : null,
      user: trip.userId ? `/api/users/${trip.userId}` : null,
      cancel: `/api/trips/${trip.id}/cancel`,
    },
  };
}

// GET /api/trips
router.get('/', async (req, res) => {
  try {
    const { routeId, date, type, status, subscriptionId, userId } = req.query;

    let sql = 'SELECT * FROM trips WHERE 1=1';
    const params = [];

    if (routeId) {
      sql += ' AND routeId = ?';
      params.push(routeId);
    }
    if (subscriptionId) {
      sql += ' AND subscriptionId = ?';
      params.push(subscriptionId);
    }
    if (userId) {
      sql += ' AND userId = ?';
      params.push(userId);
    }
    if (date) {
      sql += ' AND date = ?';
      params.push(date);
    }
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    const [rows] = await db.query(sql, params);

    res.json({
      data: rows.map(addTripLinks),
      total: rows.length,
      source: 'MySQL Database at ' + process.env.DB_HOST,
      _links: {
        self: '/api/trips',
      },
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// POST /api/trips
router.post('/', async (req, res) => {
  try {
    const { routeId, subscriptionId, userId, date, type, status = 'scheduled' } =
      req.body;

    if (!routeId || !date || !type) {
      return res.status(400).json({
        error: 'Missing required fields: routeId, date, type',
      });
    }

    const now = new Date();
    const sql = `
      INSERT INTO trips (routeId, subscriptionId, userId, date, type, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(sql, [
      routeId,
      subscriptionId || null,
      userId || null,
      date,
      type,
      status,
      now,
      now,
    ]);

    const trip = {
      id: result.insertId,
      routeId,
      subscriptionId: subscriptionId || null,
      userId: userId || null,
      date,
      type,
      status,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const resourcePath = `/api/trips/${trip.id}`;

    res.status(201).location(resourcePath).json(addTripLinks(trip));
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// GET /api/trips/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sql = 'SELECT * FROM trips WHERE id = ?';
    const [rows] = await db.query(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    res.json(addTripLinks(rows[0]));
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// POST /api/trips/:id/cancel
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    
    const checkSql = 'SELECT * FROM trips WHERE id = ?';
    const [rows] = await db.query(checkSql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const taskId = nextTaskId++;
    const task = {
      id: String(taskId),
      type: 'trip-cancel',
      tripId: String(id),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    asyncTasks[task.id] = task;

    setTimeout(async () => {
      try {
        const updateSql = 'UPDATE trips SET status = ?, updatedAt = ? WHERE id = ?';
        const now = new Date();
        await db.query(updateSql, ['cancelled', now, id]);

        asyncTasks[task.id].status = 'success';
        asyncTasks[task.id].finishedAt = new Date().toISOString();
        asyncTasks[task.id].result = {
          tripId: id,
          status: 'cancelled',
        };
      } catch (error) {
        asyncTasks[task.id].status = 'failed';
        asyncTasks[task.id].error = error.message;
      }
    }, 3000);

    const statusPath = `/api/trip-tasks/${task.id}`;

    res.status(202).location(statusPath).json({
      taskId: task.id,
      status: task.status,
      _links: {
        self: statusPath,
        trip: `/api/trips/${id}`,
      },
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// GET /api/trip-tasks/:taskId
router.get('/trip-tasks/:taskId', (req, res) => {
  const { taskId } = req.params;
  const task = asyncTasks[String(taskId)];

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const statusPath = `/api/trip-tasks/${task.id}`;

  res.json({
    id: task.id,
    type: task.type,
    tripId: task.tripId,
    status: task.status,
    createdAt: task.createdAt,
    finishedAt: task.finishedAt || null,
    result: task.result || null,
    error: task.error || null,
    _links: {
      self: statusPath,
      trip: `/api/trips/${task.tripId}`,
    },
  });
});

module.exports = router;
