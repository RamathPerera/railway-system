# 🚆 Railway Booking System

A full-stack railway ticket booking platform built with **React (Vite)**, **Node.js (Express)**, **TypeScript**, and **MySQL (Sequelize)**. It supports dynamic distance-based pricing, real-time seat availability with concurrency-safe locking, and a complete booking lifecycle (search → seat selection → checkout → payment confirmation).

---

## ✨ Features

- **Search & Dynamic Pricing** — Users pick an origin, destination, and date. Fares are computed on the fly from route distances:
  `(distance_from_origin(destination) − distance_from_origin(origin)) × PRICE_PER_KM`.
- **Live Seat Map** — Coaches rendered as tabs with a color-coded grid (Available / Booked / Pending / Selected).
- **Concurrency-Safe Seat Locking** — Seats are temporarily locked for 10 minutes using row-level locking (`SELECT ... FOR UPDATE`) and a `locked_until` timestamp, preventing two passengers from selecting the same seat.
- **Full Booking Lifecycle** — Create a pending booking, confirm payment, or cancel; a live countdown shows when a pending booking expires.
- **Fleet Expansion Ready** — Each trip stores a snapshot of its coaches and seats (`TripCoach` / `TripSeat`), so adding trains or coaches never requires a schema change.

---

## 🏗️ Architecture Overview

### Segment-Based Booking
A **Booking** is the parent record and holds a collection of **BookingSegment** rows — one per seat per trip. This inherently supports a single user booking multiple seats/segments in one transaction, and each segment records its own fare, start stop, and end stop.

### Row-Level Locking for Concurrency
When a user selects a seat, the backend:

1. Runs `SELECT ... FOR UPDATE` on the requested `TripSeat` rows to serialize concurrent requests.
2. Verifies the seat is not already locked (`locked_until > now`) and has no overlapping **CONFIRMED** booking segment.
3. Locks the seat by setting `locked_until = now + 10 minutes` and creates the `Booking` + `BookingSegment` rows.

Pending seats are treated as **unavailable** to other users. If payment isn't completed before `locked_until`, the seat automatically returns to **Available** on the next request or cron sweep.

### Trip Snapshots for Fleet Expansion
Routes are dynamic entities. Adding a new route (e.g., Matara–Vavuniya) requires only new `Route`, `RouteStop`, and `Schedule` entries — no schema changes. Each trip materializes its own `TripCoach`/`TripSeat` snapshot from the train's `MasterCoach` template, so coaches can be added or removed per trip independently.

---

## 🧰 Tech Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React 19, Vite, TypeScript, Tailwind CSS v4, TanStack Query, React Router, Axios, Sonner, Lucide |
| Backend   | Node.js, Express 5, TypeScript, Sequelize ORM, Zod |
| Database  | MySQL 8 |
| Infra     | Docker, Docker Compose, Nginx |

---

## 🚀 Quick Start (Docker — one command)

> Prerequisites: [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/).

```bash
# 1. Build and start all services (db, backend, frontend)
docker compose up --build

# 2. In a second terminal, seed the database with sample data
docker exec -it railway_backend_container npm run seed:prod
```

Once running:

- **Frontend (UI):** http://localhost:8080
- **Backend (API):** http://localhost:5000/api
- **MySQL:** localhost:3306 (`railway_db` / user `root` / password `root`)

> The frontend is served by Nginx, which proxies `/api` to the backend — so the browser only ever talks to one origin (no CORS issues).

### Troubleshooting Port Conflicts

If the default ports (**8080** for the frontend, **5000** for the backend) are already in use on your machine, you can override them **without changing any code** by prefixing the command with environment variables:

```bash
FRONTEND_PORT=3000 BACKEND_PORT=5001 docker compose up --build -d
```

The host port mappings are configurable via environment variables (with sensible defaults):

| Service  | Env Variable      | Default | Internal Port |
|----------|-------------------|---------|---------------|
| Frontend | `FRONTEND_PORT`   | `8080`  | `80`          |
| Backend  | `BACKEND_PORT`    | `5000`  | `5000`        |
| Database | `DB_PORT`         | `3306`  | `3306`        |

> If you change the frontend port, access the app at `http://localhost:<NEW_PORT>` — e.g. `http://localhost:3000` when using `FRONTEND_PORT=3000`.

### Stopping the stack


```bash
docker compose down
```

To also remove the database volume (fresh start):

```bash
docker compose down -v
```

---

## 🧪 Running the Seeder

The seeder wipes and repopulates the database with:

- 7 stations along the **Colombo–Badulla Main Line**
- 1 route with ordered stops and cumulative distances
- 2 trains with their master coaches (Reserved + Unreserved)
- 2 schedules and 3 trips (today & tomorrow)
- Trip-level coach/seat snapshots

```bash
docker exec -it railway_backend_container npm run seed:prod
```

---

## 💻 Local Development (without Docker)

### Backend

```bash
cd backend
npm install
# create a .env file with DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT, PORT
npm run seed      # populate the database
npm run dev       # start with hot reload (tsx watch)
```

### Frontend

```bash
cd frontend
npm install
# ensure frontend/.env has VITE_API_BASE_URL=http://localhost:5000/api
npm run dev       # Vite dev server
```

---

## 🔌 API Endpoints

| Method | Endpoint                        | Description                          |
|--------|---------------------------------|--------------------------------------|
| GET    | `/api/stations`                 | List all stations                    |
| GET    | `/api/trips?date&origin&dest`   | Search trips with dynamic fare       |
| GET    | `/api/trips/:tripId/seats`      | Seat map for a trip (paginated)      |
| POST   | `/api/bookings`                 | Create a booking (locks seats)       |
| GET    | `/api/bookings/:id`             | Fetch booking details                |
| PATCH  | `/api/bookings/:id/pay`         | Confirm payment                      |
| PATCH  | `/api/bookings/:id/cancel`      | Cancel booking                       |

---

## 📁 Project Structure

```
railway-system/
├── backend/            # Express + Sequelize API
│   ├── src/
│   │   ├── config/     # DB connection
│   │   ├── controllers/# Request handlers
│   │   ├── models/     # Sequelize models
│   │   ├── routes/     # Express routers
│   │   ├── services/   # Business logic (pricing, locking, bookings)
│   │   └── utils/      # Validation schemas
│   └── Dockerfile
├── frontend/           # React + Vite SPA
│   ├── src/
│   │   ├── pages/      # Search, SeatMap, Checkout
│   │   ├── services/   # Axios API client
│   │   └── types/      # Shared TypeScript types
│   └── Dockerfile      # Multi-stage (build → Nginx)
└── docker-compose.yml  # One-shot stack (db + backend + frontend)
```
