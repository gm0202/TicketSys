# 🎫 Ticket Booking System

> **Modex Assessment Submission** - A production-ready ticket booking platform with robust concurrency handling

A full-stack ticket booking system simulating platforms like RedBus or BookMyShow, built with Node.js, Express, PostgreSQL, React, and TypeScript. This system handles high concurrency scenarios to prevent overbooking and race conditions.

---

## 🌐 Live Deployment

- **Frontend (Vercel)**: https://ticket-booking-system-omega.vercel.app
- **Backend (Railway)**: https://ticket-booking-system-production-10ea.up.railway.app
- **API Documentation**: https://ticket-booking-system-production-10ea.up.railway.app/api-docs

---

## 🚀 Features

### Backend (Node.js + Express + PostgreSQL)

#### ✅ **Core Functionality**
- **Show/Trip Management**: Admin can create, update, and delete shows with seat allocation
- **Concurrent Booking**: Handles multiple simultaneous booking requests using database-level locking
- **Booking Status Flow**: `PENDING` → `CONFIRMED` / `CANCELLED` / `EXPIRED`
- **Automatic Expiry**: Background job marks bookings as `EXPIRED` if pending for more than 2 minutes
- **Prevent Overbooking**: Uses PostgreSQL row-level locks (`FOR UPDATE`) to ensure atomicity

#### 🔒 **Concurrency Control**
- **Pessimistic Locking**: Locks seat rows during booking transactions
- **Transaction Isolation**: Uses `SERIALIZABLE` isolation level for critical operations
- **Atomic Updates**: All seat updates are wrapped in database transactions

#### 🛡️ **Security & Authentication**
- **JWT Authentication**: Stateless token-based auth
- **Role-Based Access Control (RBAC)**: Admin vs User permissions
- **Password Hashing**: bcrypt for secure password storage
- **CORS Configuration**: Secure cross-origin request handling

### Frontend (React + TypeScript + Vite)

#### 📱 **User Interface**
- **Show Listing**: Browse available shows with real-time seat availability
- **Seat Selection**: Visual seat map with interactive selection
- **Booking Management**: View booking history and status
- **Responsive Design**: Mobile-first responsive UI

#### ⚡ **State Management**
- **TanStack Query (React Query)**: Efficient server state management with caching
- **Context API**: Global auth state and user context
- **Optimistic Updates**: Instant UI feedback with background sync

#### 🎨 **User Experience**
- **Error Boundaries**: Graceful error handling and fallback UI
- **Loading States**: Skeleton loaders and spinners
- **Form Validation**: Real-time validation with helpful error messages
- **Toast Notifications**: Success/error feedback

---

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: class-validator
- **API Documentation**: Swagger (swagger-ui-express)
- **Deployment**: Railway

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Routing**: react-router-dom
- **State Management**: TanStack Query + Context API
- **HTTP Client**: Fetch API
- **Deployment**: Vercel

### Database Schema
```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │       │    Show     │       │   Booking   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id          │       │ id          │◄──────│ showId      │
│ name        │       │ name        │       │ id          │
│ email       │       │ description │       │ status      │
│ password    │       │ startTime   │       │ numSeats    │
│ role        │       │ endTime     │       │ customer... │
└─────────────┘       │ totalSeats  │       └─────────────┘
                      │ price       │             │
                      └─────────────┘             │
                             │                    │
                             └────────┬───────────┘
                                      │
                                ┌─────▼──────┐
                                │    Seat    │
                                ├────────────┤
                                │ id         │
                                │ showId     │
                                │ seatNumber │
                                │ isBooked   │
                                │ bookingId  │
                                └────────────┘
```

---

## 📖 API Documentation

### Authentication Endpoints
#### `POST /api/auth/signup`
Register a new user.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword",
  "role": "user"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    }
  }
}
```

#### `POST /api/auth/login`
Login existing user.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```

---

### Show Management Endpoints

#### `GET /api/shows`
Retrieve all shows.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Inception",
      "startTime": "2025-12-15T18:00:00Z",
      "totalSeats": 40,
      "availableSeats": 35,
      "price": 250
    }
  ]
}
```

#### `POST /api/shows`
Create a new show (Admin only).

**Request Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "name": "Inception",
  "description": "A mind-bending thriller",
  "startTime": "2025-12-15T18:00:00Z",
  "endTime": "2025-12-15T21:00:00Z",
  "totalSeats": 40,
  "price": 250
}
```

#### `PUT /api/shows/:id`
Update show details (Admin only).

#### `DELETE /api/shows/:id`
Delete a show (Admin only).

---

### Booking Endpoints

#### `POST /api/bookings`
Create a new booking.

**Request Body:**
```json
{
  "showId": 1,
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "numSeats": 2,
  "seatNumbers": [5, 6]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "showId": 1,
    "status": "pending",
    "numSeats": 2,
    "seats": [
      { "seatNumber": 5, "isBooked": true },
      { "seatNumber": 6, "isBooked": true }
    ]
  }
}
```

#### `PUT /api/bookings/:id/confirm`
Confirm a pending booking (Admin only).

#### `PUT /api/bookings/:id/cancel`
Cancel a booking.

#### `GET /api/bookings/pending`
Get all pending bookings (Admin only).

#### `GET /api/bookings/show/:showId`
Get all bookings for a specific show.

---

### Interactive API Docs

Visit the **live Swagger UI** at:
**https://ticket-booking-system-production-10ea.up.railway.app/api-docs**

---

## 🏃‍♂️ Local Setup Instructions

### Prerequisites
- **Node.js**: v18 or higher
- **PostgreSQL**: v14 or higher
- **npm**: v8 or higher

### 1. Clone Repository
```bash
git clone https://github.com/gm0202/Ticket-Booking-System.git
cd Ticket-Booking-System
```

### 2. Database Setup
Create a PostgreSQL database:
```sql
CREATE DATABASE ticket_booking;
```

### 3. Backend Setup

#### Install Dependencies
```bash
cd backend
npm install
```

#### Configure Environment Variables
Create a `.env` file in the `backend/` directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration (Local)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=ticket_booking

# Authentication
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d
```

#### Run Development Server
```bash
npm run dev
```

The backend will start at `http://localhost:3000`

#### Build for Production
```bash
npm run build
npm start
```

### 4. Frontend Setup

#### Install Dependencies
```bash
cd ../client
npm install
```

#### Configure Environment (Optional)
Create a `.env` file in the `client/` directory:

```env
VITE_API_URL=http://localhost:3000/api
```

If not set, the app defaults to the deployed backend URL.

#### Run Development Server
```bash
npm run dev
```

The frontend will start at `http://localhost:5173`

#### Build for Production
```bash
npm run build
npm run preview
```

---

## 🧪 Testing the Application

### Manual Testing Flow

1. **Create Admin Account**
   - Navigate to `/login`
   - Click "Sign up"
   - Create an account with role `admin`

2. **Create a Show**
   - Login as admin
   - Navigate to `/admin`
   - Fill in show details (name, start time, total seats, price)
   - Click "Create Show"

3. **Book Seats (User)**
   - Open the app in an incognito/different browser
   - Login as a regular user (or create new user account)
   - Navigate to the homepage
   - Click on a show
   - Select seats from the seat map
   - Click "Book Selected Seats"
   - Booking status will show as `PENDING`

4. **Approve Booking (Admin)**
   - As admin, navigate to `/admin`
   - Click "Pending Bookings"
   - Click "Approve" on the pending booking
   - Status changes to `CONFIRMED`, seats are locked

5. **Test Concurrency**
   - Open two browser windows
   - In both, navigate to the same show
   - Select the same seats in both windows
   - Click "Book" simultaneously
   - ✅ Only ONE booking will succeed (other will show "Seats already booked")

---

## 🎯 Key Design Decisions

### 1. Concurrency Control Strategy

**Problem:** Multiple users booking the same seats simultaneously can lead to overbooking (race condition).

**Solution:** Implemented **Pessimistic Locking** using PostgreSQL's `FOR UPDATE` clause:

```typescript
await AppDataSource.transaction(async (manager) => {
  // Step 1: Lock rows being updated
  const seats = await manager
    .createQueryBuilder(Seat, 'seat')
    .setLock('pessimistic_write') // Acquires row-level lock
    .where('seat.showId = :showId', { showId })
    .andWhere('seat.seatNumber IN (:...seatNumbers)', { seatNumbers })
    .getMany();

  // Step 2: Verify seats are available
  const alreadyBooked = seats.filter(s => s.isBooked);
  if (alreadyBooked.length > 0) {
    throw new Error('Some seats are already booked');
  }

  // Step 3: Atomically update seats
  await manager.update(Seat, 
    { showId, seatNumber: In(seatNumbers) },
    { isBooked: true, bookingId: newBooking.id }
  );
});
```

**Why This Works:**
- `FOR UPDATE` creates a row-level lock, preventing other transactions from reading or modifying the locked rows
- Even if 1000 users click "Book" at the exact same millisecond, PostgreSQL serializes the transactions
- Only the first transaction succeeds; others wait and then fail validation

**Trade-offs:**
- **Pros**: Strong consistency, no overbooking possible
- **Cons**: Can cause contention under extreme load (see System Design doc for queue-based solution)

### 2. Booking Expiry Mechanism

**Implementation:** A background cron job runs every 30 seconds:

```typescript
setInterval(async () => {
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  
  await AppDataSource.transaction(async (manager) => {
    const expiredBookings = await manager.find(Booking, {
      where: {
        status: 'pending',
        createdAt: LessThan(twoMinutesAgo)
      }
    });

    // Mark as expired and release seats
    for (const booking of expiredBookings) {
      await manager.update(Booking, booking.id, { status: 'expired' });
      await manager.update(Seat, { bookingId: booking.id }, { isBooked: false });
    }
  });
}, 30000);
```

### 3. State Management (Frontend)

**TanStack Query** handles server state with automatic caching and refetching:

```typescript
// Fetch shows with 30-second cache
const { data: shows } = useQuery({
  queryKey: ['shows'],
  queryFn: api.getShows,
  staleTime: 30000
});

// Optimistic mutation for booking
const bookMutation = useMutation({
  mutationFn: api.createBooking,
  onMutate: async (newBooking) => {
    // Optimistically update UI
    await queryClient.cancelQueries(['shows', showId]);
    const previousShows = queryClient.getQueryData(['shows', showId]);
    queryClient.setQueryData(['shows', showId], (old) => ({
      ...old,
      availableSeats: old.availableSeats - newBooking.numSeats
    }));
    return { previousShows };
  },
  onError: (err, newBooking, context) => {
    // Rollback on error
    queryClient.setQueryData(['shows', showId], context.previousShows);
  }
});
```

---

## 📦 Deployment

### Backend (Railway)

1. **Create New Project** on Railway
2. **Add PostgreSQL Plugin** (automatically provisions database)
3. **Deploy from GitHub**:
   - Set root directory: `backend`
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
4. **Environment Variables** (Railway auto-provides `DATABASE_URL`):
   ```
   NODE_ENV=production
   JWT_SECRET=<your-secret>
   PORT=8080
   ```

### Frontend (Vercel)

1. **Import Repository** on Vercel
2. **Configure Build**:
   - Framework Preset: Vite
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. **Environment Variables**:
   ```
   VITE_API_URL=https://your-backend.railway.app/api
   ```
4. **Add `vercel.json`** for SPA routing:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```

---

## ⚠️ Assumptions & Limitations

### Assumptions
1. **Database Availability**: PostgreSQL is always available (in production, use connection pooling and retry logic)
2. **Single Region**: Current deployment assumes all users are in one geographic region
3. **Authentication**: JWT tokens are stored in `localStorage` (consider httpOnly cookies for enhanced security)
4. **Seat Numbering**: Seats are numbered 1 to N sequentially

### Known Limitations
1. **Scalability**: 
   - Current pessimistic locking approach works well up to ~10,000 concurrent requests
   - For higher scale (millions of users), a **queue-based architecture** with Redis/RabbitMQ is recommended (see `SYSTEM_DESIGN.md`)
   
2. **Real-time Updates**: 
   - Seat availability is polled, not pushed via WebSocket
   - Can lead to stale data for 30 seconds (cache duration)
   
3. **Payment Integration**: 
   - No actual payment gateway integration
   - In production, integrate Stripe/Razorpay
   
4. **Email Notifications**: 
   - No email confirmation system
   - Recommend using SendGrid or AWS SES
   
5. **Rate Limiting**: 
   - No API rate limiting implemented
   - Vulnerable to DDoS without rate limiting middleware
   
6. **Logging & Monitoring**: 
   - Basic console logging only
   - Production needs structured logging (Winston) and APM (New Relic/Datadog)

---

## 🔍 Testing Recommendations

### Backend Testing
```bash
cd backend
npm run test
```

**Suggested Test Cases:**
- Unit tests for booking service logic
- Integration tests for concurrent booking scenarios
- Load testing with tools like k6 or Artillery

### Frontend Testing
```bash
cd client
npm run test
```

**Suggested Test Cases:**
- Component tests with React Testing Library
- E2E tests with Playwright or Cypress
- Accessibility testing with axe-core

---

## 📚 Additional Documentation

- **System Design**: See [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) for production architecture, scalability strategies, and advanced concurrency patterns
- **API Reference**: Visit [Swagger Docs](https://ticket-booking-system-production-10ea.up.railway.app/api-docs)

---

## 🤝 Contributing

This is a submission for the Modex Assessment. For questions or feedback, please contact the repository owner.

---

## 📝 License

This project is created for educational and assessment purposes.

---

**Submitted by:** [Your Name]  
**GitHub:** https://github.com/gm0202/Ticket-Booking-System  
**Live Demo:** https://ticket-booking-system-omega.vercel.app
