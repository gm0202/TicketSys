# Ticket Booking System

A robust ticket booking system simulating RedBus or BookMyShow, built with Node.js, Express, PostgreSQL, and React. This system handles high concurrency to prevent overbooking and provides both Admin and User interfaces.

## 🚀 Features

### Core Bookings
*   **Concurrency Handling**: Uses pessimistic locking (`FOR UPDATE`) to prevent race conditions when booking seats.
*   **Booking Flows**: Supports `PENDING`, `CONFIRMED`, `CANCELLED`, and `EXPIRED` status flows.
*   **Booking Expiry**: Automatically marks bookings as `EXPIRED` if not confirmed within 2 minutes.

### Admin Dashboard (`/admin`)
*   **Manage Shows**: Create, Update, and Delete shows/trips.
*   **Booking Management**: View bookings for specific shows.
*   **Authentication**: Basic role-based access control (Admin/User).

### User Features
*   **Browse Shows**: View available shows and trips.
*   **Book Seats**: Select specific seat numbers.
*   **Visual Feedback**: Real-time feedback on seat availability.

## 🛠 Tech Stack

*   **Backend**: Node.js, Express.ts, PostgreSQL, TypeORM
*   **Frontend**: React, TypeScript, Vite, TanStack Query
*   **Database**: PostgreSQL
*   **Tools**: Swagger (API Docs), ESLint, Biome

## 📖 API Documentation

The backend includes auto-generated Swagger documentation.

1.  Start the backend.
2.  Visit **`http://localhost:3000/api-docs`** to explorer the API.

## 🏃‍♂️ Setup Instructions

### Prerequisites
*   Node.js (v18+)
*   PostgreSQL

### 1. Database Setup
Create a PostgreSQL database:
```sql
CREATE DATABASE ticket_booking;
```

### 2. Backend Setup
1.  Navigate to `backend`:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure Environment:
    Create `.env` file in `backend/`:
    ```env
    PORT=3000
    DB_HOST=localhost
    DB_PORT=5432
    DB_USERNAME=postgres
    DB_PASSWORD=postgres
    DB_NAME=ticket_booking
    JWT_SECRET=your_jwt_secret_key
    ```
4.  Run Migrations (if applicable) or Start Server (TypeORM will sync schema):
    ```bash
    npm run dev
    ```

### 3. Frontend Setup
1.  Navigate to `client`:
    ```bash
    cd client
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start Development Server:
    ```bash
    npm run dev
    ```
4.  Open `http://localhost:5173`.

## ⚙️ Key Design Decisions

1.  **Concurrency Control**:
    *   We used **Pessimistic Locking** (`setLock('pessimistic_write')`) on the `Show` and `Seat` entities during booking transactions. This ensures that even if two users click "Book" at the exact same millisecond, only one transaction will succeed in claiming the seats.

2.  **Validation**:
    *   Backend validation uses `class-validator` to ensure data integrity.
    *   Frontend validation mimics backend rules for immediate feedback.

3.  **State Management**:
    *   `TanStack Query` (React Query) is used for server state management (caching, re-fetching).
    *   `Context API` manages global auth state.

## ⚠️ Assumptions & Limitations

*   **Authentication**: The current auth system is a mock implementation for demonstration. In production, this would be replaced with a robust JWT/Passport solution.
*   **Payments**: Payment processing is simulated.
*   **Scalability**: While the database locking handles concurrency well for this scale, extremely high scale (millions of concurrent users) might require a distributed queue (Redis/Kafka) approach to decouple booking requests from processing.

## 📄 API Endpoints

*   `GET /api/shows`: List all shows
*   `POST /api/shows`: Create a show (Admin)
*   `PUT /api/shows/:id`: Update a show (Admin)
*   `DELETE /api/shows/:id`: Delete a show (Admin)
*   `POST /api/bookings`: Create a booking
*   `PUT /api/bookings/:id/confirm`: Confirm a booking
*   `PUT /api/bookings/:id/cancel`: Cancel a booking

---
Submitted for Modex Assessment.
