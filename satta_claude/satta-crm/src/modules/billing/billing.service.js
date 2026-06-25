import Stripe from 'stripe'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

const PRICE_MAP = {
  basic:      () => process.env.STRIPE_PRICE_BASICO,
  pro:        () => process.env.STRIPE_PRICE_PROFISSIONAL,
  enterprise: () => process.env.STRIPE_PRICE_BUSINESS,
}

export async function createCheckoutSession(accountId, userEmail, planId) {
  const stripe  = getStripe()
  const priceId = PRICE_MAP[planId]?.()
  if (!priceId) throw new Error('Plano inválido.')

  const origin = process.env.APP_URL || 'https://satta-crm-production.up.railway.app'

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode:                 'subscription',
    customer_email:       userEmail,
    line_items:           [{ price: priceId, quantity: 1 }],
    success_url:          `${origin}/pagamento-sucesso?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:           `${origin}/escolher-plano`,
    metadata:             { accountId, planId },
    subscription_data:    { metadata: { accountId, planId } },
  })

  return session
}

export async function createPortalSession(stripeCustomerId) {
  const stripe = getStripe()
  const origin = process.env.APP_URL || 'https://satta-crm-production.up.railway.app'

  const session = await stripe.billingPortal.sessions.create({
    customer:   stripeCustomerId,
    return_url: `${origin}/configuracoes`,
  })

  return session
}

export async function handleWebhookEvent(rawBody, signature) {
  const stripe = getStripe()
  let event

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    throw new Error(`Assinatura inválida: ${err.message}`)
  }

  const { getFirestore } = await import('firebase-admin/firestore')
  const db = getFirestore()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const { accountId, planId } = session.metadata || {}
    if (accountId && planId) {
      await db.collection('empresas').doc(accountId).update({
        plano:                  planId,
        stripeCustomerId:       session.customer,
        stripeSubscriptionId:   session.subscription,
        planoAtualizadoEm:      new Date(),
      })
      console.log(`[billing] plano ativado account=${accountId} plano=${planId}`)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object
    const { accountId } = sub.metadata || {}
    if (accountId) {
      await db.collection('empresas').doc(accountId).update({
        plano:             'basic',
        planoAtualizadoEm: new Date(),
      })
      console.log(`[billing] assinatura cancelada — downgrade account=${accountId}`)
    }
  }
}
