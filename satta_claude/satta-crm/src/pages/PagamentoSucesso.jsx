import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Check } from 'lucide-react'

export default function PagamentoSucesso() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { refreshEmpresa } = useAuth()
  const [pronto, setPronto] = useState(false)

  const { empresa } = useAuth()

  useEffect(() => {
    const timer = setTimeout(async () => {
      await refreshEmpresa?.()
      setPronto(true)
    }, 3000)
    return () => clearTimeout(timer)
  }, [refreshEmpresa])

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        <div className="w-14 h-14 rounded-full bg-ok-bg border border-ok-text/30 flex items-center justify-center mx-auto mb-6">
          <Check size={24} className="text-ok-text" strokeWidth={2.5} />
        </div>

        <h1 className="font-bricolage text-xl font-semibold text-text mb-2">
          Pagamento confirmado
        </h1>
        <p className="text-text-2 text-sm mb-8">
          Sua assinatura está ativa. Bem-vindo ao Satta CRM.
        </p>

        {pronto ? (
          <button
            onClick={() => navigate(empresa?.nome ? '/' : '/onboarding')}
            className="w-full bg-ink hover:bg-blue-hover text-white font-medium py-2.5 rounded-md text-sm transition-colors"
          >
            {empresa?.nome ? 'Ir para o painel' : 'Configurar meu negócio'}
          </button>
        ) : (
          <p className="text-text-3 text-xs">Ativando seu plano...</p>
        )}
      </div>
    </div>
  )
}
