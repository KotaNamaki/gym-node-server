import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import {getDBPool} from './src/config/db.js'

import authRoutes from './src/routes/auth.routes.js'
import userRoutes from './src/routes/user.routes.js'
import classRoutes from './src/routes/class.routes.js'
import bookingRoutes from './src/routes/booking.routes.js'
import analyticsRoutes from './src/routes/analytics.routes.js'
import progressRoutes from './src/routes/progress.routes.js'
import reviewRoutes from './src/routes/review.routes.js'
import errorMiddleware from './src/middleware/Error.Middleware.js'

dotenv.config()
getDBPool()

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/sessions', classRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/progress', progressRoutes)
app.use('/api/reviews', reviewRoutes)

app.use(errorMiddleware)

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))