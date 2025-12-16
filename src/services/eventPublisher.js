// src/services/eventPublisher.js
const { PubSub } = require('@google-cloud/pubsub');

// Initialize Pub/Sub client
// When running on GCP, credentials are automatic
// For local development, set GOOGLE_APPLICATION_CREDENTIALS env var
let pubsub;
let pubsubEnabled = false;

try {
  pubsub = new PubSub();
  pubsubEnabled = true;
  console.log('✅ Pub/Sub client initialized');
} catch (error) {
  console.warn('⚠️ Pub/Sub not configured - events will be logged only');
  console.warn('   To enable: npm install @google-cloud/pubsub');
}

// Topic names - these should match what you create in GCP
const TOPICS = {
  SUBSCRIPTION_EVENTS: 'subscription-events',
  TRIP_EVENTS: 'trip-events'
};

/**
 * Publish an event to a Pub/Sub topic
 * @param {string} topicName - The topic to publish to
 * @param {object} eventData - The event payload
 */
async function publishEvent(topicName, eventData) {
  // Build the message
  const message = {
    eventType: eventData.eventType,
    timestamp: new Date().toISOString(),
    source: 'microservice-3-subscription',
    version: '1.0',
    data: eventData.data
  };

  // Always log the event (useful for debugging)
  console.log(`📤 Event: ${eventData.eventType}`);
  console.log(`   Topic: ${topicName}`);
  console.log(`   Data:`, JSON.stringify(eventData.data, null, 2));

  // If Pub/Sub is not enabled, just log and return
  if (!pubsubEnabled || !pubsub) {
    console.log('   [Pub/Sub disabled - event logged only]');
    return null;
  }

  try {
    const topic = pubsub.topic(topicName);
    
    // Check if topic exists
    const [exists] = await topic.exists();
    if (!exists) {
      console.warn(`   ⚠️ Topic "${topicName}" does not exist`);
      console.log('   Create it with: gcloud pubsub topics create ' + topicName);
      return null;
    }

    // Publish the message
    const messageId = await topic.publishMessage({
      data: Buffer.from(JSON.stringify(message)),
      attributes: {
        eventType: eventData.eventType,
        source: 'microservice-3'
      }
    });

    console.log(`   ✅ Published! Message ID: ${messageId}`);
    return messageId;
  } catch (error) {
    console.error(`   ❌ Failed to publish: ${error.message}`);
    // Don't throw - event publishing should not break the main flow
    return null;
  }
}

// Convenience methods for specific events
const EventPublisher = {
  // ========================================
  // Subscription Events
  // ========================================
  
  /**
   * Emit event when a new subscription is created
   */
  async subscriptionCreated(subscription) {
    return publishEvent(TOPICS.SUBSCRIPTION_EVENTS, {
      eventType: 'subscription.created',
      data: {
        id: subscription.id,
        userId: subscription.userId,
        routeId: subscription.routeId,
        semester: subscription.semester,
        status: subscription.status,
        createdAt: subscription.createdAt
      }
    });
  },

  /**
   * Emit event when a subscription is updated
   */
  async subscriptionUpdated(subscription, changes = {}) {
    return publishEvent(TOPICS.SUBSCRIPTION_EVENTS, {
      eventType: 'subscription.updated',
      data: {
        id: subscription.id,
        userId: subscription.userId,
        routeId: subscription.routeId,
        semester: subscription.semester,
        status: subscription.status,
        updatedAt: subscription.updatedAt,
        changes: changes // What fields changed
      }
    });
  },

  /**
   * Emit event when a subscription is deleted
   */
  async subscriptionDeleted(subscriptionId, userId) {
    return publishEvent(TOPICS.SUBSCRIPTION_EVENTS, {
      eventType: 'subscription.deleted',
      data: {
        id: subscriptionId,
        userId: userId,
        deletedAt: new Date().toISOString()
      }
    });
  },

  // ========================================
  // Trip Events
  // ========================================

  /**
   * Emit event when a new trip is created
   */
  async tripCreated(trip) {
    return publishEvent(TOPICS.TRIP_EVENTS, {
      eventType: 'trip.created',
      data: {
        id: trip.id,
        routeId: trip.routeId,
        subscriptionId: trip.subscriptionId,
        userId: trip.userId,
        date: trip.date,
        type: trip.type,
        status: trip.status,
        createdAt: trip.createdAt
      }
    });
  },

  /**
   * Emit event when a trip cancellation is requested
   */
  async tripCancellationRequested(tripId, taskId) {
    return publishEvent(TOPICS.TRIP_EVENTS, {
      eventType: 'trip.cancellation_requested',
      data: {
        tripId: tripId,
        taskId: taskId,
        requestedAt: new Date().toISOString()
      }
    });
  },

  /**
   * Emit event when a trip is successfully cancelled
   */
  async tripCancelled(tripId, taskId) {
    return publishEvent(TOPICS.TRIP_EVENTS, {
      eventType: 'trip.cancelled',
      data: {
        tripId: tripId,
        taskId: taskId,
        cancelledAt: new Date().toISOString()
      }
    });
  },

  /**
   * Emit event when trip cancellation fails
   */
  async tripCancellationFailed(tripId, taskId, error) {
    return publishEvent(TOPICS.TRIP_EVENTS, {
      eventType: 'trip.cancellation_failed',
      data: {
        tripId: tripId,
        taskId: taskId,
        error: error,
        failedAt: new Date().toISOString()
      }
    });
  }
};

module.exports = EventPublisher;