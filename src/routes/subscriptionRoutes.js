// src/routes/subscriptionRoutes.js
const express = require('express');
const crypto = require('crypto');

const router = express.Router();

let subscriptions = [];
let nextId = 1;

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

// GET /api/subscriptions
// query params + pagination + linked data
router.get('/', (req, res) => {
  let { userId, routeId, semester, status, page, pageSize } = req.query;

  let result = subscriptions;

  if (userId) {
    result = result.filter((s) => String(s.userId) === String(userId));
  }
  if (routeId) {
    result = result.filter((s) => String(s.routeId) === String(routeId));
  }
  if (semester) {
    result = result.filter((s) => s.semester === semester);
  }
  if (status) {
    result = result.filter((s) => s.status === status);
  }

  const total = result.length;
  page = parseInt(page || '1', 10);
  pageSize = parseInt(pageSize || String(total || 1), 10);

  const pageCount = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  const items = result.slice(start, end).map(addLinks);

  const basePath = '/api/subscriptions';
  const links = {
    self: `${basePath}?page=${page}&pageSize=${pageSize}`,
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
  });
});

// POST /api/subscriptions
// 201 Created + Location header + linked data
router.post('/', (req, res) => {
  const { userId, routeId, semester, status = 'active' } = req.body;

  if (!userId || !routeId || !semester) {
    return res.status(400).json({
      error: 'Missing required fields: userId, routeId, semester',
    });
  }

  const now = new Date().toISOString();

  const subscription = {
    id: nextId++,
    userId,
    routeId,
    semester,
    status,
    createdAt: now,
    updatedAt: now,
  };

  subscription.etag = computeEtag(subscription);
  subscriptions.push(subscription);

  const resourcePath = `/api/subscriptions/${subscription.id}`;

  res
    .status(201)
    .location(resourcePath)
    .json(addLinks(subscription));
});

// GET /api/subscriptions/:id
// ETag header on GET
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const subscription = subscriptions.find((s) => String(s.id) === String(id));

  if (!subscription) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  if (!subscription.etag) {
    subscription.etag = computeEtag(subscription);
  }

  res.set('ETag', subscription.etag).json(addLinks(subscription));
});

// PUT /api/subscriptions/:id
// ETag + If-Match + 412/428
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const ifMatch = req.headers['if-match'];

  const subscription = subscriptions.find((s) => String(s.id) === String(id));

  if (!subscription) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  if (!subscription.etag) {
    subscription.etag = computeEtag(subscription);
  }

  if (!ifMatch) {
    return res.status(428).json({
      error: 'Precondition Required: If-Match header is required for updates',
    });
  }

  if (ifMatch !== subscription.etag) {
    return res.status(412).json({
      error: 'Precondition Failed: ETag does not match current resource state',
    });
  }

  const { userId, routeId, semester, status } = req.body;

  if (userId !== undefined) subscription.userId = userId;
  if (routeId !== undefined) subscription.routeId = routeId;
  if (semester !== undefined) subscription.semester = semester;
  if (status !== undefined) subscription.status = status;

  subscription.updatedAt = new Date().toISOString();
  subscription.etag = computeEtag(subscription);

  res.set('ETag', subscription.etag).json(addLinks(subscription));
});

// DELETE /api/subscriptions/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const idx = subscriptions.findIndex((s) => String(s.id) === String(id));

  if (idx === -1) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  subscriptions.splice(idx, 1);
  res.status(204).send();
});

module.exports = router;
