import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import { apiRateLimiter } from './middleware/rateLimiter.js'
import { notFound } from './middleware/notFound.js'
import { errorHandler } from './middleware/errorHandler.js'
import routes from './routes/index.js'

const app = express()

app.disable('x-powered-by')
// Required for correct client IPs / rate-limiting behind reverse proxies.
app.set('trust proxy', 1)
app.use(helmet())
app.use(
  cors({
    origin: env.corsOrigin.split(',').map((value) => value.trim()),
    credentials: true,
  }),
)
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'))
app.use(
  express.json({
    limit: '1mb',
    verify: (req, res, buf) => {
      // Preserve raw body for optional Meta signature verification.
      req.rawBody = Buffer.isBuffer(buf) ? buf : Buffer.from(buf || '')
    },
  }),
)
app.use(express.urlencoded({ extended: true }))

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'WhatsApp AI Customer Support API',
    data: {
      version: '1.0.0',
      store: env.dataStore,
    },
  })
})

app.use('/api', apiRateLimiter, routes)

app.use(notFound)
app.use(errorHandler)

export default app
