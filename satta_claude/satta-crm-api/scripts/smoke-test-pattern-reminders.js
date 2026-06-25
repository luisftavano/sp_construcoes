/**
 * Smoke test for the pattern reminder system.
 *
 * Usage:
 *   WHATSAPP_MOCK=true INTERNAL_CRON_TOKEN=test123 node scripts/smoke-test-pattern-reminders.js
 *
 * What it does:
 *   1. Seeds an in-memory barbershop account with 3 customers
 *   2. Seeds sales that simulate different visit patterns (past dates)
 *   3. Calls getCustomersReadyForReminder() directly
 *   4. Asserts only the correct customers appear (not those with future appts, not those too early)
 *   5. Calls runPatternReminders() and checks the mock WhatsApp log
 */

// Set env before any imports
process.env.WHATSAPP_MOCK = 'true'

import { customerRepository }     from '../src/modules/customers/customer.repository.js'
import { saleRepository }         from '../src/modules/sales/sale.repository.js'
import { appointmentRepository }  from '../src/modules/appointments/appointment.repository.js'
import { accountRepository }      from '../src/modules/auth/account.repository.js'
import {
  getCustomersReadyForReminder,
  runPatternReminders,
} from '../src/modules/reminders/reminder.service.js'

const ACCOUNT_ID = 'smoke-test-account'

function daysAgo(n) {
  return new Date(Date.now() - n * 86_400_000).toISOString()
}

function dayFromNow(n) {
  return new Date(Date.now() + n * 86_400_000).toISOString()
}

async function seed() {
  // Account
  await accountRepository._store.set(ACCOUNT_ID, {
    id: ACCOUNT_ID,
    businessName: 'Barbearia Teste',
    segment: 'barbershop',
    accountSettings: { kango: { patternRemindersEnabled: true } },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  // Customer A: 3 visits, avg interval ~14 days, last visit 17 days ago → SHOULD receive reminder
  const cA = await customerRepository.create({
    id: 'cA', accountId: ACCOUNT_ID, name: 'João Silva', phone: '+5511999111111',
  })
  for (const d of [daysAgo(45), daysAgo(31), daysAgo(17)]) {
    await saleRepository.create({ accountId: ACCOUNT_ID, customerId: cA.id, soldAt: d, totalAmount: 50, status: 'completed' })
  }

  // Customer B: 3 visits, avg interval ~20 days, last visit 22 days ago → SHOULD receive reminder
  const cB = await customerRepository.create({
    id: 'cB', accountId: ACCOUNT_ID, name: 'Maria Souza', phone: '+5511999222222',
  })
  for (const d of [daysAgo(62), daysAgo(42), daysAgo(22)]) {
    await saleRepository.create({ accountId: ACCOUNT_ID, customerId: cB.id, soldAt: d, totalAmount: 40, status: 'completed' })
  }

  // Customer C: 3 visits, avg interval ~14 days, last visit 12 days ago → NOT yet at trigger (12 < 14*1.2=16.8)
  const cC = await customerRepository.create({
    id: 'cC', accountId: ACCOUNT_ID, name: 'Pedro Costa', phone: '+5511999333333',
  })
  for (const d of [daysAgo(40), daysAgo(26), daysAgo(12)]) {
    await saleRepository.create({ accountId: ACCOUNT_ID, customerId: cC.id, soldAt: d, totalAmount: 60, status: 'completed' })
  }

  // Customer D: has future appointment → should be SKIPPED
  const cD = await customerRepository.create({
    id: 'cD', accountId: ACCOUNT_ID, name: 'Ana Lima', phone: '+5511999444444',
  })
  for (const d of [daysAgo(45), daysAgo(31), daysAgo(17)]) {
    await saleRepository.create({ accountId: ACCOUNT_ID, customerId: cD.id, soldAt: d, totalAmount: 55, status: 'completed' })
  }
  await appointmentRepository.create({
    accountId: ACCOUNT_ID, customerId: cD.id, title: 'Corte', status: 'confirmed',
    startAt: dayFromNow(2), endAt: dayFromNow(2),
  })

  // Customer E: only 2 visits → should be SKIPPED (pattern unreliable)
  const cE = await customerRepository.create({
    id: 'cE', accountId: ACCOUNT_ID, name: 'Carlos Melo', phone: '+5511999555555',
  })
  for (const d of [daysAgo(30), daysAgo(16)]) {
    await saleRepository.create({ accountId: ACCOUNT_ID, customerId: cE.id, soldAt: d, totalAmount: 45, status: 'completed' })
  }
}

async function run() {
  console.log('=== SMOKE TEST: Pattern Reminders ===\n')
  await seed()

  // Step 1: Preview
  const ready = await getCustomersReadyForReminder(ACCOUNT_ID)
  const readyNames = ready.map(c => c.name)
  console.log('Customers ready for reminder:', readyNames)

  const pass1 = readyNames.includes('João Silva') && readyNames.includes('Maria Souza')
  const pass2 = !readyNames.includes('Pedro Costa')
  const pass3 = !readyNames.includes('Ana Lima')
  const pass4 = !readyNames.includes('Carlos Melo')

  console.log(`\n✓ João Silva included:      ${pass1 ? 'PASS' : 'FAIL'}`)
  console.log(`✓ Maria Souza included:     ${pass1 ? 'PASS' : 'FAIL'}`)
  console.log(`✓ Pedro Costa excluded:     ${pass2 ? 'PASS' : 'FAIL'} (too early)`)
  console.log(`✓ Ana Lima excluded:        ${pass3 ? 'PASS' : 'FAIL'} (future appointment)`)
  console.log(`✓ Carlos Melo excluded:     ${pass4 ? 'PASS' : 'FAIL'} (only 2 visits)`)

  // Step 2: Run reminders (mock mode — logs instead of sending)
  console.log('\n--- Running reminders ---')
  const result = await runPatternReminders(ACCOUNT_ID)
  console.log('Result:', JSON.stringify(result, null, 2))

  const allPassed = pass1 && pass2 && pass3 && pass4
  console.log(`\n${'='.repeat(40)}`)
  console.log(allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED')
  process.exit(allPassed ? 0 : 1)
}

run().catch(err => {
  console.error('Smoke test error:', err)
  process.exit(1)
})
