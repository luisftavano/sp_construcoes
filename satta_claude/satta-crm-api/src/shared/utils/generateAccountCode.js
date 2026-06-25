const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const ALPHANUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function pick(set) {
  return set[Math.floor(Math.random() * set.length)]
}

export function generateAccountCode() {
  const prefix = pick(LETTERS) + pick(LETTERS)
  const suffix = Array.from({ length: 5 }, () => pick(ALPHANUM)).join('')
  return `${prefix}-${suffix}`
}

/**
 * Keeps generating codes until one doesn't collide.
 * @param {(code: string) => Promise<boolean>} existsFn
 */
export async function generateUniqueAccountCode(existsFn, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateAccountCode()
    if (!(await existsFn(code))) return code
  }
  throw new Error('Could not generate unique account code — try again')
}
