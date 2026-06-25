import { Router } from 'express'
import { authenticate } from '../../../shared/middlewares/authenticate.js'
import { requireActiveSubscription } from '../../../shared/middlewares/requireActiveSubscription.js'
import { authUrl, oauthCallback } from './googleCalendar.controller.js'

const router = Router()

// Returns Google OAuth consent URL for the account owner to authorize
router.get('/auth-url',  authenticate, requireActiveSubscription, authUrl)

// Google redirects here after user grants permission (no JWT — public callback)
router.get('/callback', oauthCallback)

export default router
