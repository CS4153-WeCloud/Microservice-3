/**
 * Cloud Function: Subscription Event Processor
 * 
 * This function is triggered by Pub/Sub events from Microservice-3
 * when subscriptions are created, updated, or deleted.
 * 
 * It processes the events and can:
 * - Send notification emails
 * - Update analytics
 * - Trigger downstream processes
 * - Log events for auditing
 */

const functions = require('@google-cloud/functions-framework');

/**
 * Main Cloud Function entry point
 * Triggered by Pub/Sub subscription-events topic
 * 
 * @param {Object} cloudEvent - The Pub/Sub event
 */
functions.cloudEvent('processSubscriptionEvent', async (cloudEvent) => {
  try {
    // Extract the message data from the Cloud Event
    const pubsubMessage = cloudEvent.data?.message || cloudEvent.data;
    
    // Decode the base64 message data
    let messageData = {};
    if (pubsubMessage.data) {
      const decodedData = Buffer.from(pubsubMessage.data, 'base64').toString();
      messageData = JSON.parse(decodedData);
    }
    
    const messageAttributes = pubsubMessage.attributes || {};
    
    // Log the event details
    console.log('========================================');
    console.log('📨 Pub/Sub Event Received');
    console.log('========================================');
    console.log('Event ID:', cloudEvent.id);
    console.log('Cloud Event Type:', cloudEvent.type);
    console.log('Event Type:', messageAttributes.eventType || messageData.eventType);
    console.log('Source:', messageAttributes.source || messageData.source);
    console.log('Timestamp:', messageData.timestamp || new Date().toISOString());
    console.log('Message Data:', JSON.stringify(messageData, null, 2));
    
    // Process based on event type
    const eventType = messageAttributes.eventType || messageData.eventType;
    
    switch(eventType) {
      case 'subscription.created':
        await handleSubscriptionCreated(messageData.data);
        break;
      
      case 'subscription.updated':
        await handleSubscriptionUpdated(messageData.data);
        break;
      
      case 'subscription.deleted':
        await handleSubscriptionDeleted(messageData.data);
        break;
      
      default:
        console.log('⚠️ Unknown event type:', eventType);
    }
    
    console.log('✅ Event processed successfully');
    console.log('========================================');
    
  } catch (error) {
    console.error('❌ Error processing event:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    // Don't throw - we don't want to retry failed events indefinitely
  }
});

/**
 * Handle subscription.created events
 */
async function handleSubscriptionCreated(data) {
  console.log('🎉 Processing: Subscription Created');
  console.log(`   User ${data.userId} subscribed to Route ${data.routeId}`);
  console.log(`   Semester: ${data.semester}`);
  console.log(`   Subscription ID: ${data.id}`);
  
  // In a real system, you would:
  // - Send welcome email to user
  // - Update analytics/metrics
  // - Notify route creator
  // - Add to billing system
  
  // Simulate email notification
  const emailContent = {
    to: `user-${data.userId}@columbia.edu`,
    subject: 'Subscription Confirmed - Columbia Point2Point',
    body: `Your subscription to Route ${data.routeId} for ${data.semester} has been confirmed!`
  };
  
  console.log('📧 Email notification:', JSON.stringify(emailContent, null, 2));
  
  // Simulate analytics update
  console.log('📊 Analytics: Increment subscription_count metric');
  
  return { success: true, action: 'created', subscriptionId: data.id };
}

/**
 * Handle subscription.updated events
 */
async function handleSubscriptionUpdated(data) {
  console.log('🔄 Processing: Subscription Updated');
  console.log(`   Subscription ID: ${data.id}`);
  console.log(`   New Status: ${data.status}`);
  console.log(`   Changes:`, JSON.stringify(data.changes, null, 2));
  
  // Check if subscription was cancelled
  if (data.changes && data.changes.status && data.changes.status.to === 'cancelled') {
    console.log('❌ Subscription cancelled - processing refund/notification');
    
    const emailContent = {
      to: `user-${data.userId}@columbia.edu`,
      subject: 'Subscription Cancelled - Columbia Point2Point',
      body: `Your subscription to Route ${data.routeId} has been cancelled.`
    };
    
    console.log('📧 Cancellation email:', JSON.stringify(emailContent, null, 2));
  }
  
  return { success: true, action: 'updated', subscriptionId: data.id };
}

/**
 * Handle subscription.deleted events
 */
async function handleSubscriptionDeleted(data) {
  console.log('🗑️ Processing: Subscription Deleted');
  console.log(`   Subscription ID: ${data.id}`);
  console.log(`   User ID: ${data.userId}`);
  
  // In a real system:
  // - Clean up related data
  // - Update analytics
  // - Archive records
  
  console.log('🧹 Cleanup: Archive subscription data');
  console.log('📊 Analytics: Decrement subscription_count metric');
  
  return { success: true, action: 'deleted', subscriptionId: data.id };
}

// Export for testing
module.exports = { 
  processSubscriptionEvent: functions.cloudEvent,
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted
};
