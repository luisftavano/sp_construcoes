import * as authService from './auth.service.js'

export async function register(req, res, next) {
  try {
    const result = await authService.register(req.body)
    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
}

export async function login(req, res, next) {
  try {
    const result = await authService.login(req.body)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function me(req, res) {
  res.json({ user: req.user })
}
