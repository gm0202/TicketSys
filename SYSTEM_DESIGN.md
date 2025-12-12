# System Design Document
## Ticket Booking System - Production-Grade Architecture

---

## 1. Executive Summary

This document outlines the architecture and design decisions for scaling the Ticket Booking System to handle production-level traffic similar to platforms like RedBus or BookMyShow. The system is designed to handle high concurrency, prevent overbooking, and maintain data consistency under heavy load.

---

## 2. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Load Balancer (AWS ALB)                  │
│                    SSL Termination & Health Checks               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
        ┌───────▼──────┐          ┌──────▼────────┐
        │   Frontend   │          │   Frontend    │
        │  (Vercel CDN)│          │ (Vercel CDN)  │
        │   React App  │          │  React App    │
        └──────────────┘          └───────────────┘
                │                         │
                └────────────┬────────────┘
                             │
                ┌────────────▼──────────────┐
                │     API Gateway           │
                │  Rate Limiting & Auth     │
                └────────────┬──────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼─────────┐  ┌──────▼──────────┐  ┌─────▼──────────┐
│  API Server 1   │  │  API Server 2   │  │  API Server N  │
│  (Node.js/      │  │  (Node.js/      │  │  (Node.js/     │
│   Express)      │  │   Express)      │  │   Express)     │
└───────┬─────────┘  └──────┬──────────┘  └─────┬──────────┘
        │                   │                    │
        │    ┌──────────────┴──────────────┐    │
        │    │                              │    │
        │    │        Redis Cluster         │    │
        │    │   (Cache + Session Store)    │    │
        │    │                              │    │
        │    └──────────────┬───────────────┘    │
        │                   │                    │
        └───────────────────┼────────────────────┘
                            │
        ┌───────────────────▼────────────────────┐
        │       PostgreSQL Primary (Write)       │
        │         (Master Database)              │
        └───────────────────┬────────────────────┘
                            │
        ┌───────────────────┼────────────────────┐
        │                   │                    │
┌───────▼─────────┐  ┌──────▼──────────┐  ┌─────▼──────────┐
│ Read Replica 1  │  │ Read Replica 2  │  │ Read Replica N │
│  (Analytics)    │  │  (User Queries) │  │  (Reporting)   │
└─────────────────┘  └─────────────────┘  └────────────────┘

        ┌──────────────────────────────────────┐
        │      Message Queue (RabbitMQ/SQS)    │
        │  - Booking Confirmations             │
        │  - Email Notifications               │
        │  - Seat Expiry Jobs                  │
        └──────────────────────────────────────┘
```

### Key Components:

1. **Load Balancer**: Distributes traffic across multiple API servers
2. **API Servers**: Stateless Node.js/Express instances (horizontal scaling)
3. **Cache Layer**: Redis for session storage, rate limiting, and frequently accessed data
4. **Database**: PostgreSQL with read replicas for scalability
5. **Message Queue**: Asynchronous processing for non-critical operations
6. **CDN**: Static asset delivery and global distribution

---

## 3. Database Design & Scalability

### 3.1 Current Schema

**Core Tables:**
- `user`: User accounts (admin/customer)
- `show`: Shows/Events/Trips with metadata
- `booking`: Booking records with status tracking
- `seat`: Individual seat allocation with booking references

### 3.2 Indexes for Performance

```sql
-- Critical indexes for high-traffic queries
CREATE INDEX idx_show_start_time ON show(start_time);
CREATE INDEX idx_booking_show_id ON booking(show_id);
CREATE INDEX idx_booking_status ON booking(status);
CREATE INDEX idx_seat_show_booking ON seat(show_id, booking_id);
CREATE INDEX idx_seat_is_booked ON seat(show_id, is_booked);
```

### 3.3 Scaling Strategies

#### **Vertical Scaling (Short-term)**
- Increase CPU/RAM on database instance
- Use faster storage (NVMe SSDs)
- Optimize connection pooling

#### **Read Replicas (Medium-term)**
- **Primary DB**: Handle all writes (CREATE, UPDATE, DELETE)
- **Read Replicas**: Handle read-heavy queries (show listings, analytics)
- Route read queries to replicas using connection pool logic

```javascript
// Example: Read/Write Split
const writePool = new Pool({ connectionString: PRIMARY_DB_URL });
const readPool = new Pool({ connectionString: REPLICA_DB_URL });

// Write operations
await writePool.query('INSERT INTO booking...');

// Read operations
await readPool.query('SELECT * FROM show WHERE...');
```

#### **Horizontal Partitioning / Sharding (Long-term)**

**Partition by Geographic Region:**
```
Shard 1: US shows (show_id % 4 == 0)
Shard 2: EU shows (show_id % 4 == 1)
Shard 3: APAC shows (show_id % 4 == 2)
Shard 4: Other regions (show_id % 4 == 3)
```

**Benefits:**
- Reduced query load per database
- Geographic data locality (faster queries)
- Isolated failure domains
+ Cross-shard queries require aggregation layer
- Schema migrations more complex
- Rebalancing shards as data grows

#### **Caching Layer (Redis)**

Cache frequently accessed data:
```javascript
// Cache show details for 5 minutes
const cachedShow = await redis.get(`show:${showId}`);
if (cachedShow) return JSON.parse(cachedShow);

const show = await db.query('SELECT * FROM show WHERE id = $1', [showId]);
await redis.setex(`show:${showId}`, 300, JSON.stringify(show));
```

**Cache Keys:**
- `show:{id}` - Show metadata
- `show:{id}:seats` - Available seat count
- `user:{id}:bookings` - User's booking history

**Cache Invalidation:**
- Invalidate on booking confirmation
- TTL-based expiry for non-critical data
- Pub/Sub for real-time updates

---

## 4. Concurrency Control Mechanisms

### 4.1 Current Implementation: Database Transactions

The system uses **SELECT FOR UPDATE** row-level locks:

```typescript
await AppDataSource.transaction(async (manager) => {
  // Lock selected seats
  const seats = await manager
    .createQueryBuilder(Seat, 'seat')
    .setLock('pessimistic_write') // Row-level lock
    .where('seat.id IN (:...ids)', { ids: seatIds })
    .getMany();

  // Verify availability
  if (seats.some(s => s.isBooked)) {
    throw new Error('Seats already booked');
  }

  // Atomically update seats
  await manager.update(Seat, seatIds, { 
    isBooked: true, 
    bookingId: newBooking.id 
  });
});
```

**Benefits:**
- Strong consistency guarantees
- No overbooking possible
- Built-in rollback on failure
- Can be used with distributed systems where db is single source of truth

**Limitations:**
- Can cause contention under extreme load
- Locks can lead to deadlocks if not managed carefully

### 4.2 Production Enhancements

#### **Optimistic Locking (Version-based)**

Add a `version` column to the `seat` table:

```sql
ALTER TABLE seat ADD COLUMN version INTEGER DEFAULT 0;
```

```typescript
// Check version before update
const result = await manager.update(Seat, 
  { id: seatId, version: currentVersion },
  { isBooked: true, version: currentVersion + 1 }
);

if (result.affected === 0) {
  throw new Error('Seat was modified by another request');
}
```

**Benefits:**
- No locks required
- Higher throughput for read-heavy workloads
- Better for distributed systems with high latency

**Trade-offs:**
- Retries needed for write conflicts (higher application complexity)

#### **Distributed Locks (Redis)**

For distributed systems with multiple API servers:

```typescript
import Redlock from 'redlock';

const redlock = new Redlock([redisClient]);

const lock = await redlock.lock(`lock:show:${showId}`, 5000); // 5s TTL

try {
  // Perform booking logic
  await bookSeats(showId, seatIds);
} finally {
  await lock.unlock();
}
```

**Use Case:** Prevent race conditions across multiple servers before even hitting the DB.

### 4.3 Queue-Based Booking (Event-Driven)

For extremely high traffic (e.g., flash sales):

```
User Request → API Server → Queue (Pending Bookings) → Worker Pool → DB
```

**Workflow:**
1. User submits booking → Returns `PENDING` immediately
2. Job queued in RabbitMQ/SQS
3. Worker processes queue sequentially
4. Updates booking status to `CONFIRMED` or `FAILED`
5. Notifies user via WebSocket/Email

**Benefits:**
- Decouple request handling from processing
- Graceful degradation under load
- Prevents database overload during spikes

---

## 5. Caching Strategy

### 5.1 Multi-Layer Caching

1. **CDN Layer (Vercel/CloudFlare)**
   - Static assets (HTML, CSS, JS)
   - Edge caching for global users (lower latency)

2. **Application Cache (Redis)**
   - Session data (JWT invalidation lists)
   - API response caching (Show lists)
   - Rate limiting counters

3. **Database Query Cache**
   - PostgreSQL query result cache
   - Materialized views for complex analytics queries

### 5.2 Cache Patterns

#### **Cache-Aside Pattern**
```typescript
async function getShow(id: number) {
  const cached = await redis.get(`show:${id}`);
  if (cached) return JSON.parse(cached);

  const show = await db.query('SELECT * FROM show WHERE id = $1', [id]);
  await redis.setex(`show:${id}`, 300, JSON.stringify(show));
  return show;
}
```

#### **Write-Through Cache**
```typescript
async function updateShow(id: number, data: any) {
  await db.query('UPDATE show SET ... WHERE id = $1', [id]);
  await redis.setex(`show:${id}`, 300, JSON.stringify(data));
}
```

### 5.3 Cache Eviction Policies

- **LRU (Least Recently Used)**: Default Redis eviction
- **TTL Expiry**: Short TTL for dynamic data (seats), long TTL for static data (show metadata)
- **Event-Based Invalidation**: Invalidate cache explicitly on booking confirmation

---

## 6. Message Queue & Asynchronous Processing

### 6.1 Use Cases

1. **Booking Expiry Worker**
   - Every 30 seconds, scan for bookings older than 2 minutes in `PENDING` status
   - Mark as `FAILED`, release seats

2. **Email Notifications**
   - Send confirmation emails asynchronously to prevent blocking the API response
   - Retry logic for failed deliveries

3. **Analytics Pipeline**
   - Stream booking events to data warehouse (Snowflake/BigQuery)
   - Real-time dashboards

### 6.2 Queue Architecture (RabbitMQ Example)

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ API Server   │──────▶│   Exchange   │──────▶│  Queue       │
│ (Publisher)  │       │ (topic/direct│       │ (Consumers)  │
└──────────────┘       └──────────────┘       └──────────────┘
                                                     │
                                                     ▼
                                           ┌─────────────────┐
                                           │ Worker Process  │
                                           │ - Update DB     │
                                           │ - Send Email    │
                                           └─────────────────┘
```

**Queues:**
- `booking.confirmed` → Email worker
- `booking.expired` → Cleanup worker
- `analytics.events` → Data pipeline

### 6.3 Dead Letter Queue (DLQ)

For failed messages:
- Retry up to 3 times with exponential backoff
- Move to DLQ for manual inspection if all retries fail
- Alert on DLQ threshold

---

## 7. API Rate Limiting & Security

### 7.1 Rate Limiting (Token Bucket Algorithm)

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  store: new RedisStore({ client: redisClient }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
});

app.use('/api/', limiter);
```

### 7.2 Authentication & Authorization

- **JWT Tokens**: Stateless auth for API servers
- **Role-Based Access Control (RBAC)**: Admin vs User permissions in middleware
- **API Keys**: For third-party integrations (if any)

---

## 8. Monitoring & Observability

### 8.1 Metrics to Track

- **Request Rate**: Requests/second per endpoint
- **Error Rate**: 4xx/5xx responses percentage
- **Latency**: P50, P95, P99 response times
- **Database**: Connection pool usage, query duration
- **Queue Depth**: Pending jobs in message queue

### 8.2 Tools

- **APM**: New Relic, Datadog
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana) or CloudWatch
- **Alerting**: PagerDuty for critical failures (e.g., DB down, high error rate)

---

## 9. Deployment & DevOps

### 9.1 CI/CD Pipeline

```
GitHub Push → GitHub Actions → Build & Test → Deploy to Staging → E2E Tests → Deploy to Production
```

### 9.2 Infrastructure as Code (IaC)

Use Terraform or AWS CDK to define:
- EC2/ECS instances
- RDS databases
- Load balancers
- Auto-scaling policies

### 9.3 Zero-Downtime Deployment

- **Blue-Green Deployment**: Run two environments, switch traffic instantly
- **Rolling Updates**: Gradually replace old instances with new ones
- **Health Checks**: Ensure new instances are healthy before routing traffic via Load Balancer

---

## 10. Cost Optimization

1. **Auto-Scaling**: Scale down during off-peak hours
2. **Reserved Instances**: Commit to long-term capacity for discounts on base load
3. **Spot Instances**: Use for non-critical workers
4. **CDN**: Offload static content from API servers to save bandwidth

---

## 11. Future Enhancements

1. **GraphQL API**: More flexible querying for frontend to reduce over-fetching
2. **WebSockets**: Real-time seat availability updates for better UX
3. **Geo-Distributed Databases**: Multi-region deployment for global latency
4. **Serverless Functions**: For event-driven tasks (AWS Lambda)
5. **AI/ML**: Dynamic pricing based on demand, user recommendations

---

## 12. Conclusion

This architecture is designed to scale from thousands to millions of users while maintaining data consistency and high availability. The combination of horizontal scaling, caching, asynchronous processing, and robust concurrency controls ensures the system can handle production workloads similar to industry leaders like RedBus and BookMyShow.
.
