import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import { getEmpresa } from '../lib/firestore'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [empresa, setEmpresa] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        const emp = await getEmpresa(u.uid)
        setEmpresa(emp)
      } else {
        setEmpresa(null)
      }
      setLoading(false)
    })
  }, [])

  async function refreshEmpresa() {
    if (user) {
      const emp = await getEmpresa(user.uid)
      setEmpresa(emp)
      return emp
    }
  }

  async function reloadUser() {
    if (auth.currentUser) {
      await auth.currentUser.reload()
      setUser(u => ({ ...u, emailVerified: auth.currentUser.emailVerified }))
    }
  }

  return (
    <AuthContext.Provider value={{ user, empresa, loading, refreshEmpresa, reloadUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
