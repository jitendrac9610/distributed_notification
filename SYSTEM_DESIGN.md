# NotifyX System Design Documentation

This document describes the architectural design, data flows, and scalability patterns implemented in **NotifyX** to support high-throughput, low-latency, and resilient notification delivery capable of scaling to millions of users.

---

## 1. System Architecture Diagram

```txt
                               +-----------------------+
                               |    React Frontend     |
                               +-----------+-----------+
                                           |
                                           | HTTP / WebSockets
                                           v
                               +-----------+-----------+
                               |     Load Balancer     |
                               +-----------+-----------+
                                           |
                        +-----------------+-----------------+
                        |                                   |
                        v                                   v
             +----------+----------+             +----------+----------+
             |  Node.js API Node 1 |             |  Node.js API Node 2 |
             | (Rate Limiter check)|             | (Rate Limiter check)|
             +----+-----------+----+             +----+-----------+----+
                  |           ^                       |           ^
      Write       |           | Pub/Sub               |           | Pub/Sub
      PENDING     |           | Broadcast             |           | Broadcast
      v           |           |                       v           |
  +---+--------+  | Enqueue   |                   +---+--------+  | Enqueue
  | PostgreSQL |  | Job       |                   | PostgreSQL |  | Job
  |  Database  |  |           |                   |  Database  |  |
  +---+--------+  v           |                   +---+--------+  v
      ^      ^    +-----------+-----------+           ^      ^    +-----------+
      |      |                |                       |      |                |
      |      +----------------)-----------------------+      +----------------+
      |                       v
      |                 +-----+-------+
      |                 |    Redis    | <-------------------------------------+
      |                 |   Instance  |                                       |
      |                 +-----+-------+                                       |
      |                       |                                               |
      |                       | Queue                                         |
      |                       v                                               |
      |                 +-----+-------+                                       |
      |                 |   BullMQ    |                                       |
      |                 |  Delivery   |                                       |
      |                 |    Queue    |                                       |
      |                 +-----+-------+                                       |
      |                       |                                               |
      |                       | Process                                       |
      |                       v                                               |
      |                 +-----+-------+                                       |
      |                 | Background  |                                       |
      +-----------------+   Worker    +---------------------------------------+
      Update Status &   +-------------+                         Publish Event
      Logs (DELIVERED)                                          (notifications)
```

---

## 2. Notification Request Lifecycle & Data Flow

### Step 1: Ingestion & Rate Limiting
* An administrator issues a POST request to `/api/notifications` to create a notification.
* The API instance intercepts the request using the **Redis-based Rate Limiting Middleware**.
  * Checks Redis key `rate_limit:notifications:${userId}`.
  * If the request count exceeds **20 requests per minute**, it returns an HTTP `429 Too Many Requests` response.
  * If within limits, it parses and validates the payload using **Zod**.

### Step 2: Database Persistence & Queueing
* The API instance registers the notification record in **PostgreSQL** with status `PENDING` and `attempts: 0`.
* Immediately following PostgreSQL persistence, the API instance registers a delivery job in the **BullMQ Queue** (backed by Redis) with the unique notification ID as the job identifier.
* The HTTP request returns `201 Created` with a standardized `ApiResponse` structure, completing the API interaction within milliseconds.

### Step 3: Background Worker Processing
* An independent background worker pulls the job from the BullMQ queue:
  * The worker increments the attempt counter in PostgreSQL.
  * The worker processes the delivery payload.
  * On success, the worker updates the status in PostgreSQL to `DELIVERED` and creates a `DeliveryLog` record.
  * On failure, it logs the error details and triggers a BullMQ exception to initiate exponential retries (up to 3 attempts). If all retries fail, it marks the status as `FAILED`.

### Step 4: Socket.io Real-Time Broadcast
* On transition to `DELIVERED`, the worker publishes a JSON broadcast payload to the Redis Pub/Sub `notifications` channel.
* Every active API/WebSocket node subscribed to the channel receives the broadcast.
* The specific node holding the active WebSocket TCP connection to the recipient user pushes the `notification:new` packet directly to the client's browser.

---

## 3. Designing for 1M+ Users (Scalability & Performance)

### 1. Ingestion Protection (Rate Limiting)
Ingesting large bursts of notifications can crash the application or exhaust database connection pools. Redis-based rate limiting guarantees that no single user or administrative account can overload the system. By running inside Redis, rate limiting checks execute in sub-millisecond times, avoiding Express routing overhead.

### 2. Database Indexes & Query Tuning
Querying notifications in a table of millions of rows becomes slow without proper indexing. The following indexes are deployed on PostgreSQL to optimize lookups:
* `@@index([recipientId])`: Accelerates lookup of a user's notifications.
* `@@index([status])`: Accelerates dashboard aggregate statistics queries.
* `@@index([recipientId, status])`: Optimizes compound filtering queries for unread/delivered notifications by specific users.
* `@@index([recipientId, createdAt])`: Accelerates sorted chronological feeds, preventing slow file-sort operations in memory.

### 3. Graceful Shutdown & Connection Pool Integrity
When horizontal nodes scale or deploy (e.g. on Kubernetes or container platforms), instances are frequently terminated. NotifyX registers listeners for `SIGINT`/`SIGTERM` to coordinate a clean shutdown:
* Stop accepting new WebSocket and HTTP connections.
* Stop the BullMQ workers to prevent pulling new tasks from the queue.
* Allow ongoing delivery tasks to finish.
* Safely drain and disconnect Redis client connections and Prisma PostgreSQL pool connections, preventing database connection leaks and data corruption.

### 4. Health Checking & Metrics Monitoring
System reliability is maintained by exposing structured health probes (`/api/health` and `/api/monitor/metrics`) to orchestrators and monitoring tools (e.g., Prometheus):
* **Health Endpoint**: Verifies database connectivity, Redis connection states, BullMQ queue connectivity, and checks if the local background worker process is running.
* **Metrics Endpoint**: Emits counts of waiting, active, delayed, completed, and failed BullMQ tasks, alongside database records count and Node process statistics.

---

## 4. Production Containerized Deployment (Docker & AWS EC2)

To move NotifyX to production, it is fully containerized using **Docker** and orchestrated using **Docker Compose** to enable easy deployment to AWS EC2 or cluster orchestrators.

### 1. Multi-Container Orchestration Architecture

Inside the AWS EC2 virtual machine hosting environment, NotifyX is isolated into five dedicated container workloads operating inside a private virtual bridge network:

```txt
                   AWS EC2 Ubuntu Server (Public IP)
                             |
                             v [Port 80 / 5000]
                     +---------------+
                     | Virtual Bridge|
                     +-------+-------+
                             |
         +-------------------+-------------------+
         |                   |                   |
         v [Port 80]         v [Port 5000]       |
  +--------------+    +--------------+           |
  |   frontend   |    |   backend    |           |
  | React+Nginx  |    | Express API  |           |
  +--------------+    +------+-------+           v
                             |            +--------------+
                             v            |    worker    |
                      +------+-------+    | BullMQ Worker|
                      |    redis     |    +------+-------+
                      | Cache/Broker |           |
                      +------+-------+           v
                             |            +--------------+
                             v            |   postgres   |
                      +------+-------+    |  PostgreSQL  |
                      |   database   |    +--------------+
                      +--------------+
```

* **Frontend Container**: Packs the React source compile generated by Vite and hosts it using an optimized Nginx server, exposing HTTP port 80.
* **Backend Container**: Runs the Express HTTP and Socket.io server on Node.js 20, exposing API port 5000.
* **Worker Container**: Reuses the backend build image, but boots in isolation using `npm run worker` to listen to the BullMQ queue and execute background message dispatches.
* **Redis Container**: Functions as the memory store coordinating queue jobs, Pub/Sub channels, and rate-limiting counters.
* **PostgreSQL Container**: Stores user authentication records, notifications metadata, and delivery logs using persistent volumes mapped to host directory storage.

### 2. High-Availability Scaling Patterns
In a scaled system:
* **API Scaling**: Launch multiple backend container replicas behind an AWS Application Load Balancer (ALB) or Nginx reverse proxy.
* **Worker Scaling**: Spin up multiple worker containers independently without changing code; BullMQ locks ensure safe single-job execution.
* **Redis Clustering**: Replace the single Redis container with a managed AWS ElastiCache cluster for sub-millisecond Redis memory operations under high throughput.
