import * as billingService from './billing.service.js'

export async function createPortal(req, res) {
  try {
    const { getFirestore } = await import('firebase-admin/firestore')
    const db = getFirestore()
    const snap = await db.collection('empresas').doc(req.uid).get()
    const stripeCustomerId = snap.data()?.stripeCustomerId

    if (!stripeCustomerId) {
      return res.status(400).json({ erro: 'Nenhuma assinatura ativa encontrada.' })
    }

    const session = await billingService.createPortalSession(stripeCustomerId)
    res.json({ url: session.url })
  } catch (err) {
    console.error('[billing] Erro ao criar portal:', err.message)
    res.status(500).json({ erro: 'Erro ao abrir portal de assinatura.' })
  }
}

export async function createCheckout(req, res) {
  const { planId } = req.body
  const validPlans = ['basic', 'pro', 'enterprise']
  if (!validPlans.includes(planId)) {
    return res.status(400).json({ erro: 'Plano inválido.' })
  }

  try {
    const session = await billingService.createCheckoutSession(
      req.uid,
      req.email,
      planId,
    )
    res.json({ url: session.url })
  } catch (err) {
    console.error('[billing] Erro ao criar checkout:', err.message)
    res.status(500).json({ erro: 'Erro ao iniciar pagamento.' })
  }
}

export async function stripeWebhook(req, res) {
  const sig = req.headers['stripe-signature']
  try {
    await billingService.handleWebhookEvent(req.body, sig)
    res.status(200).send('OK')
  } catch (err) {
    console.error('[billing] Webhook error:', err.message)
    res.status(400).send(`Webhook Error: ${err.message}`)
  }
}
