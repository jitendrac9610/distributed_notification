# NotifyX — Distributed Real-Time Notification Queue System

**NotifyX** is a production-grade, horizontally-scalable distributed real-time notification queue system. The architecture is designed to handle high ingestion rates and decouple API ingestion, queue-based background worker delivery, and live user WebSockets communication. It is engineered to scale seamlessly to 1 million users by utilizing optimized PostgreSQL indexes, Redis-based rate limiting, and BullMQ task processing.

---

## 🚀 Core Features & Additions

* **JWT Authentication & Security**: Secure user credentials, login/registration, token-based profile validation, and secure WebSocket handshakes.
* **Persistent Notification Storage**: Clean relational models (User, Notification, and Delivery Logs) persisted in PostgreSQL via Prisma ORM.
* **BullMQ Delivery Queue**: Asynchronous processing decoupling backend ingestion from delivery logic, supporting automatic retries, exponential backoff, and attempts tracking.
* **Redis Pub/Sub Coordination**: Cross-instance event distribution to broadcast messages horizontally across a cluster of WebSocket nodes.
* **Socket.io Real-Time Push**: Immediate browser toast alerts and unread counts pushed dynamically over WebSockets.
* **Offline Sync Support**: Offline notifications are stored safely in PostgreSQL and fetched automatically on user re-connection.
* **Redis-Based Rate Limiting**: Ingestion endpoints are protected with custom Redis-based rate limiting (Max 20 notifications per minute per user/admin) to prevent spam and resource exhaustion.
* **Centralized Error Handling**: Unified error middleware and standard response utilities (`ApiResponse`, `asyncHandler`) ensuring all API outputs are formatted consistently.
* **Health Check & Metrics APIs**: Detailed endpoints (`GET /api/health` and `GET /api/monitor/metrics`) exposing overall system states, connection status for databases and brokers, and live Node process stats.
* **Graceful Shutdown Hooks**: Safe termination for Express, WebSockets, BullMQ workers/queues, Redis connections, and Prisma client pools on receipt of SIGINT/SIGTERM.
* **Prisma Seed Script**: Database seeding via Prisma to bootstrap administrative and user test credentials automatically.
* **Node Ingestion Load Testing**: A native, dependency-free load-testing script to concurrently dispatch 1,000 notifications in batches and measure pipeline performance.

---

## 🛠️ Tech Stack

### Backend
* **Node.js & Express** with **TypeScript**
* **Socket.io** (WebSockets)
* **PostgreSQL** & **Prisma ORM**
* **Redis** (Pub/Sub, Rate limiting, and Queue storage)
* **BullMQ** (Redis-backed Queue)
* **Zod** (Request Schema Validation)

### Frontend
* **React** with **Vite** & **TypeScript**
* **Tailwind CSS** (Premium glassmorphic styling)
* **Zustand** (Global state management)
* **Socket.io-client**
* **Axios**
* **Lucide React** (Modern Icons)
* **React Hot Toast** (Real-time Toasts)

---

## 📁 Project Folder Structure

```txt
notifyx/
│
├── backend/
│   ├── src/
│   │   ├── config/       # Database & Redis Clients
│   │   ├── controllers/  # API Controller Logic (Auth, Notification, Monitor)
│   │   ├── middlewares/  # JWT & Rate Limit & Error handler middlewares
│   │   ├── routes/       # Express Route Mappings (Auth, Notification, Monitor)
│   │   ├── sockets/      # Socket.io Presence & Broadcasts
│   │   ├── queues/       # BullMQ Queue Managers
│   │   ├── workers/      # Background Job Processors (exposing worker)
│   │   ├── validators/   # Zod Validation Schemas
│   │   ├── utils/        # JWT, Password & ApiResponse wrappers
│   │   ├── app.ts        # Express App setup
│   │   └── server.ts     # Main Server Bootstrapper & Shutdown listeners
│   ├── prisma/
│   │   ├── schema.prisma # PostgreSQL Data Model & Indexes
│   │   └── seed.ts       # Database bootstrap seed script
│   └── .env.example      # Backend configuration template
│
├── frontend/
│   ├── src/
│   │   ├── api/          # Axios Configurations
│   │   ├── components/   # Shared Layouts (Sidebar, Route Guard)
│   │   ├── pages/        # Views (Login, Dashboard, Admin, Monitor)
│   │   ├── stores/       # Zustand State Managers (Auth, Notifications)
│   │   ├── types/        # TypeScript Interfaces
│   │   ├── App.tsx       # Routing Setup
│   │   └── main.tsx      # Entry Point
│   └── .env.example      # Frontend configuration template
│
├── load-test/
│   └── loadTest.js       # Standalone ingestion simulator
├── docker-compose.yml    # Local PostgreSQL & Redis containers
├── SYSTEM_DESIGN.md      # Architectural design specs
└── README.md             # Startup documentation
```

---

## ⚙️ Local Development Setup

### 1. Prerequisites
Ensure you have the following installed on your machine:
* **Node.js** (v18+)
* **npm** (v9+)
* **Docker Desktop** (to spin up PostgreSQL and Redis)

---

### 2. Infrastructure Setup
In the root directory, start the PostgreSQL database and Redis services using Docker Compose:
```bash
docker compose up -d
```
*This starts PostgreSQL on port `5432` and Redis on port `6379`.*

---

### 3. Backend Setup
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run database migrations to set up the tables:
   ```bash
   npx prisma migrate dev --name init
   ```
5. Run the database seed script to populate test credentials:
   ```bash
   npx prisma db seed
   ```
6. Start the backend server in development mode:
   ```bash
   npm run dev
   ```
*The backend server starts listening on `http://localhost:5000`.*

---

### 4. Frontend Setup
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the Vite React development server:
   ```bash
   npm run dev
   ```
*Open `http://localhost:5173` in your browser to view the application.*

---

## 🔑 Sandbox Credentials & Testing

For ease of testing, the Login page has **Quick-Fill buttons** to log in instantly. Alternatively, use:

### Default Admin Account
* **Email**: `admin@notifyx.com`
* **Password**: `Password123!` (Note: Capital 'P')
* *Allows access to Dashboard, Admin trigger panel, and System Monitor.*

### Default Standard User Account
* **Email**: `user@notifyx.com`
* **Password**: `Password123!`
* *Allows access to personal Dashboard and real-time feeds.*

---

## 🏋️ Load Testing & Ingestion Simulation

To test the system under load, we have provided a native Node.js load-testing script. It will authenticate as the administrator, generate 1,000 notifications in batches, and output real-time processing statistics.

1. Ensure the backend server is running and seeded.
2. In a terminal, run the script from the root directory:
   ```bash
   node load-test/loadTest.js
   ```
3. View the console output to track avg ingestion latency, success rates, and queue processing durations.

---

## ☁️ Production Containerized Deployment (Docker + AWS EC2)

NotifyX is configured for production-grade containerized deployment using Docker Compose on an AWS EC2 instance. This isolates all service workloads (PostgreSQL, Redis, API, Worker, Nginx) into separate network containers.

### Container Architecture Topology

```txt
AWS EC2 Instance (Public IP)
├── Nginx Web Server (frontend container) -> Exposes Port 80
├── Express API & WebSockets (backend container) -> Exposes Port 5000
├── BullMQ Queue Worker (worker container) -> Runs background jobs
├── PostgreSQL Database (postgres container) -> Volume persisted
└── Redis Cache & Message Broker (redis container) -> Coordinates Pub/Sub & queues
```

### Step-by-Step Deployment Walkthrough

#### 1. Setup AWS EC2 Security Groups
Launch an Ubuntu EC2 instance (`t2.micro` or `t3.micro`) and configure the virtual firewall inbound rules:
* `Port 22 (SSH)` -> Allow from your host IP only.
* `Port 80 (HTTP)` -> Allow from `0.0.0.0/0` (public access to frontend Nginx).
* `Port 5000 (API)` -> Allow from `0.0.0.0/0` (public access to API node).

#### 2. Provision and Run Docker Compose
SSH into the EC2 instance, install Docker + Git, clone the project repository, and configure the production `.env` files.

**Build and Boot Containers:**
```bash
# Build and run containers in detached mode
docker compose -f docker-compose.prod.yml up -d --build
```

**Run Database Migrations & Seeding:**
```bash
# Deploy PostgreSQL migrations
docker exec -it notifyx-backend npx prisma migrate deploy

# Seed test database credentials
docker exec -it notifyx-backend npx prisma db seed
```

**Verify Services Health:**
```bash
# Verify all container instances are healthy
docker ps

# Verify API and Worker container logs
docker logs notifyx-backend
docker logs notifyx-worker
```

* **Frontend**: Open `http://YOUR_EC2_PUBLIC_IP` to access the main React dashboard.
* **Backend Health**: Visit `http://YOUR_EC2_PUBLIC_IP:5000/api/health` to confirm database, Redis, and worker metric checks pass.


---

## 📝 Resume Bullet Points (Interview Ready)

* **System Design Resume Bullet**: 
  > Designed and implemented **NotifyX**, a distributed real-time notification queue system using Node.js, Socket.io, Redis Pub/Sub, BullMQ, PostgreSQL, Prisma, and React. Built compound database indexes to optimize queries for 1M users, implemented Redis-based rate limiting to prevent ingestion spam, integrated centralized error handling/graceful shutdown hooks, and wrote native load-testing scripts achieving high-throughput, low-latency notification delivery.

* **Deployment Resume Bullet**:
  > Dockerized and deployed NotifyX on AWS EC2 using Docker Compose, separating React frontend, Node.js API, BullMQ worker, PostgreSQL, and Redis into independent containers; implemented WebSocket-based real-time delivery, Redis-backed queue processing, offline sync, health checks, and production environment configuration.

* **Key Scalability Answers**:
  * **How do you scale WebSockets horizontally?** WebSockets are stateful, meaning a client connects to one specific node. When a notification is processed, the backend publishes the event to a shared Redis Pub/Sub channel. All WebSocket servers listen, and the node holding the active TCP connection delivers the message.
  * **How do workers avoid database bottlenecking?** Job processing is offloaded to independent background workers. They pull tasks asynchronously from BullMQ. Databases are indexed on `(recipientId, status)` and `(recipientId, createdAt)` to ensure fast query times under high data volumes.
  * **Why implement graceful shutdowns?** Listening to SIGINT/SIGTERM ensures that when a backend instance is scaled down or restarted in production, all ongoing requests and active BullMQ jobs are finished, connections (Redis, PG) are returned to the pool cleanly, and WebSocket clients are closed without abrupt socket terminations.
