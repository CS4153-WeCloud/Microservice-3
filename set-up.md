# Microservice-3 with MySQL Database - Setup Guide

Complete guide for setting up Microservice-3 with a MySQL VM on GCP.

---

## Overview

### Architecture
```
┌─────────────────────────────────────────┐
│  Microservice-3 VM                      │
│  - Internal IP: 10.128.0.2 (example)    │
│  - External IP: [Dynamic]               │
│  - Port: 3003                           │
└────────────┬────────────────────────────┘
             │
             │ Internal MySQL Connection
             │
┌────────────▼────────────────────────────┐
│  MySQL VM                               │
│  - Internal IP: 10.128.0.3 (example)    │
│  - Port: 3306                           │
│  - No external IP                       │
│  - Database: ms3_database               │
└─────────────────────────────────────────┘
```

### Features
- **External client access** to microservice API
- **Internal MySQL connection** (secure, no internet exposure)
- Dedicated MySQL database per microservice
- RESTful API with MySQL persistence
- Swagger API documentation

---

## Part 1: MySQL Database VM Setup

### Step 1: Set Up Cloud NAT

Cloud NAT allows VMs without external IPs to install packages from the internet.
```bash
# Create Cloud Router
gcloud compute routers create nat-router \
    --network=default \
    --region=us-central1

# Create Cloud NAT
gcloud compute routers nats create nat-config \
    --router=nat-router \
    --region=us-central1 \
    --auto-allocate-nat-external-ips \
    --nat-all-subnet-ip-ranges
```

### Step 2: Create MySQL VM
```bash
# Create VM without external IP (secure)
gcloud compute instances create mysql-vm \
    --zone=us-central1-a \
    --machine-type=e2-medium \
    --network=default \
    --no-address \
    --tags=mysql-server \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud
```

### Step 3: Configure Firewall
```bash
# Allow MySQL access from internal network only
gcloud compute firewall-rules create allow-mysql-internal \
    --network=default \
    --allow=tcp:3306 \
    --source-ranges=10.128.0.0/20 \
    --target-tags=mysql-server \
    --direction=INGRESS
```

### Step 4: Install MySQL
```bash
# SSH into MySQL VM (using IAP tunnel since no external IP)
gcloud compute ssh mysql-vm \
    --zone=us-central1-a \
    --tunnel-through-iap

# Install MySQL Server
sudo apt-get update
sudo apt-get install -y mysql-server
```

### Step 5: Configure MySQL for Remote Access
```bash
# Edit MySQL configuration
sudo vim /etc/mysql/mysql.conf.d/mysqld.cnf

# Find and change this line:
#   bind-address = 127.0.0.1
# To:
#   bind-address = 0.0.0.0

# Or use this command to do it automatically:
sudo sed -i 's/bind-address.*/bind-address = 0.0.0.0/' /etc/mysql/mysql.conf.d/mysqld.cnf

# Restart MySQL
sudo systemctl restart mysql
```

### Step 6: Create Database and User
```bash
# Login to MySQL
sudo mysql
```

Run these SQL commands (replace `zh2651` and `123` with your credentials):
```sql
-- Create database
CREATE DATABASE ms3_database;

-- Create user
CREATE USER 'zh2651'@'%' IDENTIFIED BY '123';

-- Grant privileges
GRANT ALL PRIVILEGES ON ms3_database.* TO 'zh2651'@'%';
FLUSH PRIVILEGES;

-- Verify
SHOW DATABASES;
EXIT;
```

### Step 7: Create Tables and Sample Data
```bash
# Login with your new user
mysql -u zh2651 -p123 ms3_database
```

Run these SQL commands:
```sql
-- Create subscriptions table
CREATE TABLE subscriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    userId INT NOT NULL,
    routeId INT NOT NULL,
    semester VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_userId (userId),
    INDEX idx_routeId (routeId),
    INDEX idx_semester (semester),
    INDEX idx_status (status)
);

-- Create trips table
CREATE TABLE trips (
    id INT PRIMARY KEY AUTO_INCREMENT,
    routeId INT NOT NULL,
    subscriptionId INT,
    userId INT,
    date DATE NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_routeId (routeId),
    INDEX idx_subscriptionId (subscriptionId),
    INDEX idx_userId (userId),
    INDEX idx_date (date),
    INDEX idx_status (status)
);

-- Insert sample data
INSERT INTO subscriptions (userId, routeId, semester, status) VALUES 
(1, 101, 'Fall 2024', 'active'),
(2, 102, 'Fall 2024', 'active'),
(3, 101, 'Spring 2025', 'pending');

INSERT INTO trips (routeId, subscriptionId, userId, date, type, status) VALUES 
(101, 1, 1, '2025-01-15', 'morning', 'scheduled'),
(102, 2, 2, '2025-01-15', 'evening', 'scheduled'),
(101, 1, 1, '2025-01-16', 'morning', 'completed');

-- Verify data
SELECT * FROM subscriptions;
SELECT * FROM trips;

EXIT;
```

### Step 8: Get MySQL Internal IP
```bash
# While still on MySQL VM
hostname -I | awk '{print $1}'
# Output example: 10.128.0.5

# Or from your local machine
gcloud compute instances describe mysql-vm \
    --zone=us-central1-a \
    --format='get(networkInterfaces[0].networkIP)'

# Save this IP - you'll need it later!
exit
```

**MySQL VM Setup Complete!**

---

## Part 2: Microservice-3 Setup

### Step 1: Create Microservice-3 VM (with External IP)
```bash
# Create VM with external IP for client access
gcloud compute instances create microservice-3 \
    --zone=us-central1-c \
    --machine-type=e2-medium \
    --network=default \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud

# List your VMs to verify
gcloud compute instances list

# Expected output:
# NAME            ZONE           INTERNAL_IP  EXTERNAL_IP    STATUS
# mysql-vm        us-central1-a  10.128.0.5                  RUNNING
# microservice-3  us-central1-c  10.128.0.2   35.184.94.133  RUNNING
```

### Step 2: Configure Firewall for External Access
```bash
# Allow external access to port 3003
gcloud compute firewall-rules create allow-microservice-3-external \
    --network=default \
    --allow=tcp:3003 \
    --source-ranges=0.0.0.0/0 \
    --description="Allow external access to Microservice-3 API"
```

### Step 3: SSH into Microservice-3 VM
```bash
gcloud compute ssh microservice-3 \
    --zone=us-central1-c
```

### Step 4: Clone the Repository
```bash
# Clone the Microservice-3 repository
git clone https://github.com/CS4153-WeCloud/Microservice-3.git
cd Microservice-3
```

### Step 5: Install Node.js (if not installed)
```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 6: Install Dependencies
```bash
# Install all npm packages
npm install
```

### Step 7: Configure Environment Variables
```bash
# Create .env file
vim .env
```

Paste this configuration (replace DB_HOST with your MySQL VM internal IP):
```env
# Database Configuration (use MySQL VM internal IP)
DB_HOST=10.128.0.5
DB_USER=zh2651
DB_PASSWORD=123
DB_NAME=ms3_database
DB_PORT=3306

# Application Configuration
PORT=3003
NODE_ENV=production
```

### Step 8: Start the Application
```bash
npm start
```

## Part 3: Google Cloud Function Setup

### Step 1: Enable required APIs (on local machine)
```bash
PROJECT=cloud-project-480801

gcloud services enable pubsub.googleapis.com \
  cloudfunctions.googleapis.com \
  eventarc.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  --project=$PROJECT
```

### Step 2: Create Pub/Sub topics (on local machine)
```bash
gcloud pubsub topics create subscription-events --project=$PROJECT
gcloud pubsub topics create trip-events --project=$PROJECT   # optional
```

### Step 3: Give Microservice-3 VM permission to publish
```bash
VM_SA=73004011110-compute@developer.gserviceaccount.com

gcloud projects add-iam-policy-binding $PROJECT \
  --member="serviceAccount:$VM_SA" \
  --role="roles/pubsub.publisher"
```

### Step 4: Write the Cloud Function
```js
// Create a new folder (separate from microservice repo) e.g. ms3-subscription-handler/
// package.json
{
  "name": "ms3-subscription-handler",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {}
}

// index.js
exports.handleSubscriptionEvent = async (cloudevent) => {
  const msg = cloudevent.data?.message;
  const b64 = msg?.data || "";
  const raw = Buffer.from(b64, "base64").toString("utf8");

  let payload;
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.log("Non-JSON message:", raw);
    return;
  }

  console.log("✅ Pub/Sub event received");
  console.log("messageId:", msg?.messageId);
  console.log("payload:", JSON.stringify(payload, null, 2));

  // Example: branch on your eventType
  if (payload.eventType === "subscription.created") {
    console.log("🎉 New subscription created:", payload.data);
  }
};
```

### Step 5: Deploy the Cloud Function (Gen2)
```bash
PROJECT=cloud-project-480801
REGION=us-central1
FUNCTION_NAME=ms3-subscription-handler
TOPIC=subscription-events

gcloud functions deploy $FUNCTION_NAME \
  --gen2 \
  --runtime=nodejs20 \
  --region=$REGION \
  --source=. \
  --entry-point=handleSubscriptionEvent \
  --trigger-topic=$TOPIC \
  --project=$PROJECT
```