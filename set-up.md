# Microservice-3 with MySQL Database - Setup Guide

Complete guide for setting up Microservice-3 with a MySQL VM on GCP.

---

## Overview

### Architecture
```
┌─────────────────────────────────────────┐
│  Microservice-3 VM                      │
│  - Internal IP: 10.128.0.2              │
│  - Port: 3003                           │
│  - No external IP                       │
└────────────┬────────────────────────────┘
             │
             │ Internal MySQL Connection
             │
┌────────────▼────────────────────────────┐
│  MySQL VM                               │
│  - Internal IP: 10.128.0.3              │
│  - Port: 3306                           │
│  - No external IP                       │
│  - Database: ms3_database               │
└─────────────────────────────────────────┘
```

### Features
- Internal-only communication (no external IPs)
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
# Create VM without external IP
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
# SSH into MySQL VM
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
intall vim
vim /etc/mysql/mysql.conf.d/mysqld.cnf

# Find and change this line:
#   bind-address = 127.0.0.1
# To:
#   bind-address = 0.0.0.0

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
mysql -u zh2651 -p
# Enter password: 123

# Switch to database
USE ms3_database;
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
# Exit from MySQL VM
exit

# Get MySQL VM internal IP (from your local machine)
gcloud compute instances describe mysql-vm \
    --zone=us-central1-a \
    --format='get(networkInterfaces[0].networkIP)'

# Output: 10.128.0.3
# Save this IP - you'll need it later!
```

**MySQL VM Setup Complete!**

---

## Part 2: Microservice-3 Setup

### Step 1: Create Microservice-3 VM
```bash
# List your VMs
gcloud compute instances list

# Expected output:
# NAME            ZONE           INTERNAL_IP  EXTERNAL_IP  STATUS
# mysql-vm        us-central1-a  10.128.0.3                RUNNING
# microservice-3  us-central1-c  10.128.0.2                RUNNING
```

### Step 2: SSH into Microservice-3 VM
```bash
gcloud compute ssh microservice-3 \
    --zone=us-central1-c \
    --tunnel-through-iap
```

### Step 3: Clone the Repository
```bash
# Clone the Microservice-3 repository
git clone https://github.com/CS4153-WeCloud/Microservice-3.git
```

### Step 4: Install Node.js (if not installed)
```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 5: Install Dependencies
```bash
# Install all npm packages
npm install
npm list mysql2
```

### Step 6: Configure Environment Variables
```bash
# Create .env file
install vim
vim .env
```

Paste this configuration (update with your MySQL credentials):
```env
# Database Configuration
DB_HOST=10.128.0.3
DB_USER=zh2651
DB_PASSWORD=123
DB_NAME=ms3_database
DB_PORT=3306

# Application Configuration
PORT=3003
NODE_ENV=production
```

### Step 7: Start the Application
```bash
npm start
```

**Expected output:**
```
Database connected successfully
Host: 10.128.0.3
Database: ms3_database
Sample notification data initialized
Notification Service running on port 3003
API Documentation available at http://localhost:3003/api-docs
OpenAPI spec loaded from api/openapi.yaml
```

**Microservice-3 is now running and connected to MySQL**