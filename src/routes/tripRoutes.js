// src/routes/tripRoutes.js
const express = require('express');

const router = express.Router();

let trips = [];
let nextTripId = 1;

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

// GET /api/trips (collection)
// query parameters + linked data
router.get('/', (req, res) => {
  const { routeId, date, type, status, subscriptionId, userId } = req.query;

  let result = trips;

  if (routeId) {
    result = result.filter((t) => String(t.routeId) === String(routeId));
  }
  if (subscriptionId) {
    result = result.filter(
      (t) => String(t.subscriptionId) === String(subscriptionId)
    );
  }
  if (userId) {
    result = result.filter((t) => String(t.userId) === String(userId));
  }
  if (date) {
    result = result.filter((t) => t.date === date);
  }
  if (type) {
    result = result.filter((t) => t.type === type);
  }
  if (status) {
    result = result.filter((t) => t.status === status);
  }

  res.json({
    data: result.map(addTripLinks),
    total: result.length,
    _links: {
      self: '/api/trips',
    },
  });
});

// POST /api/trips
// 201 Created with Location + links
router.post('/', (req, res) => {
  const { routeId, subscriptionId, userId, date, type, status = 'scheduled' } =
    req.body;

  if (!routeId || !date || !type) {
    return res.status(400).json({
      error: 'Missing required fields: routeId, date, type',
    });
  }

  const now = new Date().toISOString();

  const trip = {
    id: nextTripId++,
    routeId,
    subscriptionId: subscriptionId || null,
    userId: userId || null,
    date, // e.g. '2025-09-15'
    type, // 'morning' | 'evening'
    status,
    createdAt: now,
    updatedAt: now,
  };

  trips.push(trip);

  const resourcePath = `/api/trips/${trip.id}`;

  res.status(201).location(resourcePath).json(addTripLinks(trip));
});

// GET /api/trips/:id
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const trip = trips.find((t) => String(t.id) === String(id));

  if (!trip) {
    return res.status(404).json({ error: 'Trip not found' });
  }

  res.json(addTripLinks(trip));
});

// POST /api/trips/:id/cancel
// 202 Accepted + async + polling
router.post('/:id/cancel', (req, res) => {
  const { id } = req.params;
  const trip = trips.find((t) => String(t.id) === String(id));

  if (!trip) {
    return res.status(404).json({ error: 'Trip not found' });
  }

  const taskId = nextTaskId++;
  const task = {
    id: String(taskId),
    type: 'trip-cancel',
    tripId: String(id),
    status: 'pending', // 'pending' | 'success' | 'failed'
    createdAt: new Date().toISOString(),
  };

  asyncTasks[task.id] = task;

  // Simulate async processing
  setTimeout(() => {
    const t = trips.find((tr) => String(tr.id) === String(id));
    if (!t) {
      asyncTasks[task.id].status = 'failed';
      asyncTasks[task.id].error = 'Trip not found during async processing';
    } else {
      t.status = 'cancelled';
      t.updatedAt = new Date().toISOString();
      asyncTasks[task.id].status = 'success';
      asyncTasks[task.id].finishedAt = new Date().toISOString();
      asyncTasks[task.id].result = {
        tripId: t.id,
        status: t.status,
      };
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
});

// GET /api/trip-tasks/:taskId
// polling for async status
// NOTE: this is defined as an ABSOLUTE path and will be mounted at /api
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
