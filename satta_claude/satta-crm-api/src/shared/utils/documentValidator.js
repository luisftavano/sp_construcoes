/** Strips everything that is not a digit. */
function digits(value) {
  return String(value).replace(/\D/g, '')
}

function allSame(str) {
  return str.split('').every(c => c === str[0])
}

export function isValidCPF(value) {
  const d = digits(value)
  if (d.length !== 11 || allSame(d)) return false

  const verifier = (len) => {
    const sum = d.slice(0, len).split('').reduce((acc, c, i) => acc + Number(c) * (len + 1 - i), 0)
    const rem = (sum * 10) % 11
    return rem >= 10 ? 0 : rem
  }

  return verifier(9) === Number(d[9]) && verifier(10) === Number(d[10])
}

export function isValidCNPJ(value) {
  const d = digits(value)
  if (d.length !== 14 || allSame(d)) return false

  const verifier = (len) => {
    const weights = len === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const sum = d.slice(0, len).split('').reduce((acc, c, i) => acc + Number(c) * weights[i], 0)
    const rem = sum % 11
    return rem < 2 ? 0 : 11 - rem
  }

  return verifier(12) === Number(d[12]) && verifier(13) === Number(d[13])
}

/** Returns 'cpf', 'cnpj', or null based on digit count. */
export function detectDocumentType(value) {
  const len = digits(value).length
  if (len === 11) return 'cpf'
  if (len === 14) return 'cnpj'
  return null
}

export function isValidDocument(value) {
  const type = detectDocumentType(value)
  if (type === 'cpf') return isValidCPF(value)
  if (type === 'cnpj') return isValidCNPJ(value)
  return false
}
