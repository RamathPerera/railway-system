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

## 🏗️ Core Design Decisions & Reasoning

### Segment-Based Booking Logic

A **Booking** is the parent record and holds a collection of **BookingSegment** rows — one per seat per trip. This inherently supports a single user booking multiple seats/segments in one transaction, and each segment records its own fare, start stop, and end stop.

Because a seat can be legitimately re-used on *different* segments of the same trip (e.g. passenger A rides Colombo→Kandy, passenger B rides Kandy→Badulla on the same seat), availability is decided by **segment overlap** rather than a simple "is the seat taken" flag. A requested segment conflicts with an existing one only when the two ranges intersect:

```
existingStart < requestedEnd  AND  existingEnd > requestedStart
```

If this condition is true, the seat is unavailable for the requested segment; otherwise the seat can be booked again on a non-overlapping portion of the journey.

### Concurrency Management

When a user selects a seat, the backend:

1. Runs `SELECT ... FOR UPDATE` on the requested `TripSeat` rows to serialize concurrent requests at the database level.
2. Verifies the seat is not already locked (`locked_until > now`) and has no overlapping **CONFIRMED** booking segment.
3. Locks the seat by setting `locked_until = now + 10 minutes` and creates the `Booking` + `BookingSegment` rows inside a single transaction.

Pending seats are treated as **unavailable** to other users. If payment isn't completed before `locked_until`, the seat automatically returns to **Available** on the next request or cron sweep — so no two passengers can ever select the same seat.

### Dynamic Distance-Based Fares

Fares are never hard-coded. Each `RouteStop` stores a cumulative `distanceFromOrigin` for its route. The fare for any journey is derived purely from geometry:

```
fare = (destDistance − originDistance) × PRICE_PER_KM
```

The backend resolves the origin and destination `RouteStop` rows for the **specific route** the trip runs on (via the trip's `Schedule.routeId`), guaranteeing correct pricing even on bidirectional routes where the same two stations appear with reversed distances.

### Snapshot Architecture

Routes are dynamic entities. Adding a new route (e.g., Matara–Vavuniya) requires only new `Route`, `RouteStop`, and `Schedule` entries — no schema changes. Each trip materializes its own `TripCoach`/`TripSeat` snapshot from the train's `MasterCoach` template, so coaches can be added or removed per trip independently. This makes the system naturally future-proof for fleet expansion: a train's physical configuration can evolve without ever altering historical trips.

---

## 🔄 Alternatives Considered

### Redis for Seat Locking vs. Database Locking

We evaluated using **Redis** to hold the 10-minute seat lock (via `SET NX EX`), which is a common pattern for distributed locks. However, we rejected it in favor of **native MySQL row-level locking** combined with the `locked_until` timestamp. This decision:

- Removes an extra infrastructure dependency (no Redis container to run, monitor, or keep consistent with the DB).
- Keeps the lock and the booking data in the **same transactional boundary**, so a crash mid-booking cannot leave a lock orphaned from its booking.
- Still provides strict concurrency safety through InnoDB's `SELECT ... FOR UPDATE`, which serializes concurrent seat selection correctly.

### DOM-Capture vs. Native PDF Generation

For E-Ticket generation we first considered **html2canvas** (capturing the rendered ticket DOM into an image). This approach crashed during parsing because modern **Tailwind CSS v4** emits `oklch()` color functions that the canvas parser cannot handle. We switched to generating the PDF **natively with jsPDF vector drawing**, which:

- Produces a faster, cleaner, and fully **text-selectable** ticket (no rasterized image).
- Avoids the fragile DOM-to-canvas pipeline entirely.
- Gives precise control over layout, fonts, and print quality.

---

## ⚠️ Challenges Faced

### Bidirectional Travel Overlap Logic

The initial overlap logic assumed **one-way travel** (`start < end`). When we added return trips (Badulla → Colombo), the segment bounds were reversed and the naive comparison broke — seats that should have been available were reported as booked and vice-versa. We solved this by normalizing the segment bounds with `Math.min` and `Math.max` before applying the overlap rule, making the system **direction-agnostic** and correct for both outbound and return journeys.

### Stale Cache on Seat Map

Navigating back from the checkout page showed **stale "Pending" seats** on the seat map, because the React Query cache was not being invalidated after a booking was confirmed or cancelled. We solved this by issuing precise `queryClient.invalidateQueries` calls for the affected trip's seat-map query immediately upon booking confirmation or cancellation, so the UI always reflects the latest seat state.

---

## ⭐ Extra Credit Features Implemented

- **Interactive Seat Map Visualization** — A realistic 2×2 train seat layout that clearly distinguishes **Available (Green)**, **Booked (Red)**, and **Pending/Locked (Yellow)** states.
- **Booking Conflict Handling** — A live **10-minute countdown timer** on the checkout page for pending holds, so users know exactly when their seats will be released.
- **E-Ticket PDF Generation** — Auto-downloads a professional, native **PDF E-ticket** upon payment confirmation.
- **Searchable UI** — A custom **type-to-filter dropdown** for station selection, improving UX over a plain `<select>`.

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

- **27 real stations** along the Colombo–Badulla Main Line
- **Bidirectional routes** (Colombo–Badulla and Badulla–Colombo) with ordered stops and cumulative distances
- **14 trips** covering 7 days (outbound + return each day)
- Trip-level coach/seat snapshots
- **Mock bookings** demonstrating segment reuse and seat locks

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

---

## 🤖 AI Tools Used

Leveraged **Gemini** and **DeepSeek** as AI pair programmers for architectural brainstorming, troubleshooting complex concurrency logic, and accelerating boilerplate implementation.
