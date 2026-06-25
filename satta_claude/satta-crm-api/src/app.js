import express from 'express'
import cors from 'cors'
import routes from './routes/index.js'
import { AppError } from './shared/errors/index.js'

const app = express()

app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.get('/health', (_, res) => res.json({ ok: true }))
app.use('/api', routes)

// Global error handler
app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error:   err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    })
  }

  console.error('[Unhandled error]', err)
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Unexpected error' })
})

export default app
