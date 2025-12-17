# Subscription Event Processor - Cloud Function

This Cloud Function processes subscription events from the `subscription-events` Pub/Sub topic.

## Function Details

- **Name**: `processSubscriptionEvent`
- **Runtime**: Node.js 18
- **Trigger**: Pub/Sub topic `subscription-events`
- **Entry Point**: `processSubscriptionEvent`

## Events Handled

1. **subscription.created** - New subscription created
2. **subscription.updated** - Subscription status changed
3. **subscription.deleted** - Subscription removed

## Deployment

```bash
# Deploy the function (Gen 2)
gcloud functions deploy processSubscriptionEvent \
  --gen2 \
  --runtime=nodejs18 \
  --region=us-central1 \
  --source=. \
  --entry-point=processSubscriptionEvent \
  --trigger-topic=subscription-events \
  --project=wecloud-475402

# Or use Gen 1
gcloud functions deploy processSubscriptionEvent \
  --runtime=nodejs18 \
  --region=us-central1 \
  --source=. \
  --entry-point=processSubscriptionEvent \
  --trigger-topic=subscription-events \
  --project=wecloud-475402
```

## Testing

Test by publishing a message to the topic:

```bash
gcloud pubsub topics publish subscription-events \
  --message='{"eventType":"subscription.created","timestamp":"2025-12-17T20:00:00Z","source":"microservice-3","data":{"id":1,"userId":14,"routeId":2,"semester":"Fall 2025","status":"active"}}' \
  --project=wecloud-475402
```

View logs:

```bash
gcloud functions logs read processSubscriptionEvent \
  --region=us-central1 \
  --limit=50 \
  --project=wecloud-475402
```

## What It Does

When a subscription event is received, the function:

1. **Logs the event** - For auditing and debugging
2. **Parses the message** - Extracts event type and data
3. **Routes to handler** - Based on event type
4. **Processes event** - Simulates:
   - Sending email notifications
   - Updating analytics metrics
   - Cleaning up related data
5. **Returns success** - Acknowledges the message

In a production system, this would integrate with:
- SendGrid/Mailgun for emails
- BigQuery for analytics
- Cloud Storage for archives
- Cloud Logging for audit trails
