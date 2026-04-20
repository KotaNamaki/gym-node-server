# Fitness Management System API

A Node.js backend for managing fitness sessions, bookings, member progress, and reviews.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the App](#running-the-app)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
  - [Auth](#auth)
  - [User Management](#user-management)
  - [Sessions/Classes](#sessionsclasses)
  - [Bookings](#bookings)
  - [Analytics](#analytics)
  - [Member Progress](#member-progress)
  - [Reviews](#reviews)
  - [Views](#views)

## Prerequisites
- Node.js (v16 or higher)
- MySQL database

## Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and add the following:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=your_user
   DB_PASSWORD=your_password
   DB_NAME=your_db_name
   JWT_SECRET=your_jwt_secret
   ```

## Running the App
```bash
npm start
```

## Authentication
Most endpoints require a JSON Web Token (JWT). To authenticate:
1. Login via `/api/auth/login`.
2. Include the token in the `Authorization` header for subsequent requests:
   ```text
   Authorization: Bearer <your_token>
   ```

---

## API Endpoints

### Auth
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register as a customer or trainer | No |
| POST | `/api/auth/login` | Login and receive JWT | No |
| GET | `/api/auth/me` | Get current user profile | Yes |
| POST | `/api/auth/admin/register` | Admin registers a new user (any role) | Yes (Admin) |

**Register Example:**
```json
{
  "nama": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "customer",
  "propinsi": "Jawa Barat",
  "kota": "Bandung"
}
```

### User Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/user` | Get all users | Yes (Admin) |
| GET | `/api/user/:id` | Get user by ID | Yes (Admin/Self) |
| GET | `/api/user/email/:email` | Get user by email | Yes (Admin) |
| DELETE | `/api/user/:id` | Delete a user | Yes (Admin) |

### Sessions/Classes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/sessions` | Get all sessions | No |
| GET | `/api/sessions/upcoming` | Get upcoming sessions | No |
| GET | `/api/sessions/:id` | Get session by ID | No |
| POST | `/api/sessions` | Create a new session | Yes (Trainer/Admin) |
| PUT | `/api/sessions/:id` | Update a session | Yes (Trainer/Admin) |
| DELETE | `/api/sessions/:id` | Delete a session | Yes (Admin) |

**Create Session Example:**
```json
{
  "title": "Morning Yoga",
  "deskripsi": "Relaxing morning yoga session",
  "trainer_id": 2,
  "start_time": "2026-05-01 08:00:00",
  "end_time": "2026-05-01 09:00:00",
  "price": 50000,
  "status": "scheduled"
}
```

### Bookings
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/bookings` | Get all bookings | Yes (Admin) |
| GET | `/api/bookings/my` | Get current user's bookings | Yes |
| GET | `/api/bookings/:id` | Get booking by ID | Yes (Admin/Owner) |
| POST | `/api/bookings` | Create a new booking | Yes (Customer) |
| PATCH | `/api/bookings/:id/status` | Update booking status | Yes (Admin/Owner for cancel) |

**Create Booking Example:**
```json
{
  "session_id": 5
}
```

### Analytics
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/analytics/users` | Get user statistics | Yes (Admin) |
| GET | `/api/analytics/bookings` | Get booking statistics | Yes (Admin) |
| GET | `/api/analytics/sessions` | Get session statistics | Yes (Admin) |

### Member Progress
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/progress` | Get all progress records | Yes (Admin) |
| GET | `/api/progress/my` | Get current user's progress | Yes |
| POST | `/api/progress` | Record new progress | Yes |
| DELETE | `/api/progress/:id` | Delete a progress record | Yes (Admin) |

**Record Progress Example:**
```json
{
  "activity": "Bench Press",
  "duration": "30 mins",
  "note": "Lifted 80kg",
  "booking_id": 10
}
```

### Reviews
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/reviews` | Get all reviews | Yes (Admin) |
| GET | `/api/reviews/session/:session_id` | Get reviews for a session | No |
| POST | `/api/reviews` | Create a review | Yes (Customer who attended) |
| DELETE | `/api/reviews/:id` | Delete a review | Yes (Admin) |

**Create Review Example:**
```json
{
  "session_id": 5,
  "rating_score": 5,
  "comment": "Great session!"
}
```

### Views
Custom reports and specific views for different roles. All require `authMiddleware`.

| Method | Endpoint | Description | Role Restriction |
|--------|----------|-------------|------------------|
| GET | `/api/views/customer-booking-history` | All booking history or own | Admin (All), Customer (Own) |
| GET | `/api/views/customer-booking-history/:id` | Booking history for specific user | Admin, Self |
| GET | `/api/views/matched-trainer-customer` | View matched trainer-customer data | Admin, Trainer |
| GET | `/api/views/progress-summary` | All progress summary | Admin, Trainer |
| GET | `/api/views/progress-summary/:id` | Progress summary for specific user | Admin, Trainer, Self |
| GET | `/api/views/session-participants/:id?` | View session participants | Admin, Trainer |
| GET | `/api/views/session-reviews/:id?` | View session reviews summary | Any Authenticated |
| GET | `/api/views/trainer-schedule/:id?` | View trainer schedule | Admin, Trainer (Own) |
| GET | `/api/views/upcoming-sessions` | View upcoming sessions for members | Any Authenticated |
