# 🎫 Modex Ticket Booking Platform  
A production-ready, concurrency-safe ticket booking system built for the Modex Assessment.  
Inspired by platforms like BookMyShow & RedBus, engineered to prevent **overbooking**, **race conditions**, and maintain consistent seat availability even under high traffic.

---

## 🌐 Live Deployment

### **Frontend (Vercel)**  
➡️ https://ticket-booking-system-git-try-gaurangs-projects-1eb2dfac.vercel.app

### **Backend (Railway)**  
➡️ https://ticket-booking-system-production-10ea.up.railway.app

### **API Docs (Swagger)**  
➡️ https://ticket-booking-system-production-10ea.up.railway.app/api-docs  

---

# 🎥 Demo Videos

### ▶️ Recording Demo  
![Recording](./assets/Recording%202025-12-12%20043511.gif)



### ▶️ Pending Booking  
![Pending Booking](./assets/pending%20booking.gif)



### ▶️ Show Booking  
![Show Booking](./assets/show%20booking%20by%20user.gif)



### ▶️ Updating Shows (Admin)  
![Updation](./assets/updation%20of%20shows.gif)

---

# 🚀 Features

## 🖥 Backend (Node.js + Express + TypeScript)

### ✅ Core Booking Logic  
- Create, update, delete **shows**  
- Reserve seats with **pessimistic locking**  
- Booking lifecycle: `PENDING → CONFIRMED | CANCELLED | EXPIRED`  
- Auto-expiry for bookings after **2 minutes**  
- Seat conflict prevention with **row-level locks**  

### 🔒 Security  
- JWT Authentication  
- Role-based access control  
- Password hashing with bcrypt  
- Validated request bodies  

### ⚙️ Concurrency Strategy  
Uses PostgreSQL lock:  
```sql
SELECT * FROM seat WHERE seatNumber IN (...) FOR UPDATE;
```

---

## 🎨 Frontend (React + TypeScript + Vite)

### 🧩 User Features  
- Real-time seat availability  
- Interactive seat grid  
- Booking management  
- Fully responsive layout  

### ⚡ State Handling  
- TanStack Query for caching & syncing  
- Global auth with Context API  
- Optimistic UI updates  

### ✨ UI Enhancements  
- Toast notifications  
- Skeleton loaders  
- Form validation  
- Error boundaries  

---

# 🧱 Tech Stack

### Backend  
- Node.js, Express  
- TypeScript  
- PostgreSQL  
- TypeORM  
- Swagger  
- Railway Deploy  

### Frontend  
- React 18  
- TypeScript  
- Vite  
- React Router  
- TanStack Query  
- Vercel Deploy  

---

# 🗄 Database Schema

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

# 📖 API Documentation

Swagger UI:  
👉 https://ticket-booking-system-production-10ea.up.railway.app/api-docs

---

# 🧑‍💻 Local Setup

## 1️⃣ Clone the Repository  
```bash
git clone https://github.com/gm0202/Ticket-Booking-System.git
cd Ticket-Booking-System
```

---

## 2️⃣ Backend Setup  
```bash
cd backend
npm install
```

Create `.env`:
```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=ticket_booking
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
```

Run:
```bash
npm run dev
```

---

## 3️⃣ Frontend Setup  
```bash
cd client
npm install
```

`.env` for local:
```env
VITE_API_URL=http://localhost:3000/api
```

Run:
```bash
npm run dev
```

---

# 🎯 Key System Design Decisions

### ✔ PostgreSQL Pessimistic Locking  
Prevents two users from booking the same seat.

### ✔ Expiry Worker  
Seats free automatically after 2 minutes for pending bookings.

### ✔ Optimistic UI Rendering  
Instant feedback with rollback on failure.

### ✔ Railway + Vercel Deployment  
Production-ready hosting.

---

# ⚠️ Known Limitations  
- No actual payment gateway  
- No WebSocket live updates  
- No rate limiting  
- Currently single-instance API  

---

# 🤝 Contributing  
For any suggestions or issues, please open an Issue or PR.

---

# 👤 Author  
**Gaurang Mishra**  
GitHub: https://github.com/gm0202  
Frontend: https://ticket-booking-system-git-try-gaurangs-projects-1eb2dfac.vercel.app

