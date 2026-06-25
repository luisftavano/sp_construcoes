/**
 * MÓDULO OPCIONAL — Mercado Livre
 * Plugável; relevante apenas para contas que vendem produto físico.
 */
import { Router } from 'express'
import { authenticate } from '../../../shared/middlewares/authenticate.js'
import { requireActiveSubscription } from '../../../shared/middlewares/requireActiveSubscription.js'
import { authUrl, oauthCallback, sync } from './mercadoLivre.controller.js'

const router = Router()

router.get('/auth-url',  authenticate, requireActiveSubscription, authUrl)
router.get('/callback',  oauthCallback)
router.post('/sync',     authenticate, requireActiveSubscription, sync)

export default router
