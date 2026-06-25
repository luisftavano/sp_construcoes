import 'dotenv/config'
import app from './app.js'
import { registerAllEventListeners } from './shared/events/registerEventListeners.js'

// Register all event listeners before accepting traffic
registerAllEventListeners()

const PORT = process.env.PORT ?? 3000
app.listen(PORT, () => {
  console.log(`Satta CRM API running on http://localhost:${PORT}`)
  console.log(`Storage: ${process.env.USE_FIRESTORE === 'true' ? 'Firestore' : 'InMemory'}`)
  console.log(`Kango:   ${process.env.KANGO_MOCK === 'true' ? 'mock' : 'real API'}`)
})
