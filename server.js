import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import dotenv from 'dotenv'
import {connectDB, getDBPool} from './src/config/db.js'

import authRoutes from './src/routes/auth.routes.js'
import userRoutes from './src/routes/user.routes.js'
import classRoutes from './src/routes/class.routes.js'
import bookingRoutes from './src/routes/booking.routes.js'
import analyticsRoutes from './src/routes/analytics.routes.js'
import progressRoutes from './src/routes/progress.routes.js'
import reviewRoutes from './src/routes/review.routes.js'
import viewsRoutes from './src/routes/views.routes.js'  // ADD THIS
import errorMiddleware from './src/middleware/Error.Middleware.js'

dotenv.config()
getDBPool()

const app = express()

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}))
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}))
app.use((req, res, next) => {
    console.log(`[Middleware] Global: ${req.method} ${req.url}`);
    
    // Normalize Content-Type to application/json if it looks like it's meant to be JSON
    // or if it's missing for POST/PUT/PATCH.
    // Some proxies/clients might send variations like application/json;charset=UTF-8
    // We normalize it to what the parser expects.
    const contentType = req.headers['content-type'];
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        if (!contentType || contentType.includes('application/json') || contentType.includes('text/plain')) {
            req.headers['content-type'] = 'application/json';
        }
    }
    
    // Explicitly set Accept header if missing to help some proxies
    if (!req.headers['accept'] || req.headers['accept'] === '*/*') {
        req.headers['accept'] = 'application/json';
    }
    
    next();
})

app.use(express.json({ 
    type: ['application/json', 'text/plain', 'text/json', '*/*'],
    limit: '50mb' 
}))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

app.use((req, res, next) => {
    console.log(`[Middleware] Body Parsed: ${JSON.stringify(req.body)}`);
    next();
})

// Rate Limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
})

app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/sessions', classRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/progress', progressRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/views', viewsRoutes)  // ADD THIS - all view endpoints will be under /api/views
app.use(errorMiddleware)

connectDB();


const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))