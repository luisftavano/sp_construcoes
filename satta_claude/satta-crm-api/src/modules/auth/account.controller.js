import * as accountService from './account.service.js'

export async function getSettings(req, res, next) {
  try {
    const settings = await accountService.getNicheSettingsForAccount(req.user.accountId)
    res.json(settings)
  } catch (err) {
    next(err)
  }
}

export async function patchSettings(req, res, next) {
  try {
    const settings = await accountService.updateAccountSettings(req.user.accountId, req.body)
    res.json(settings)
  } catch (err) {
    next(err)
  }
}

export async function getInfo(req, res, next) {
  try {
    const account = await accountService.getAccountInfo(req.user.accountId)
    res.json(account)
  } catch (err) {
    next(err)
  }
}

export async function patchInfo(req, res, next) {
  try {
    const account = await accountService.updateAccountInfo(req.user.accountId, req.body)
    res.json(account)
  } catch (err) {
    next(err)
  }
}

export async function postCompleteOnboarding(req, res, next) {
  try {
    const result = await accountService.completeOnboarding(req.user.accountId)
    res.json(result)
  } catch (err) {
    next(err)
  }
}
