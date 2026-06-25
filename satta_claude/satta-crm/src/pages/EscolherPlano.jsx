import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Check } from 'lucide-react'

const PLANOS = [
  {
    id:    'basic',
    nome:  'Básico',
    preco: 'R$39,90',
    desc:  'Para quem está começando e precisa de organização.',
    usuarios: '2 usuários',
    recursos: [
      'Agenda e agendamentos',
      'Cadastro de clientes',
      'Controle de estoque',
      'Financeiro e vendas',
      'Kango (comandos básicos)',
    ],
  },
  {
    id:       'pro',
    nome:     'Profissional',
    preco:    'R$59,90',
    desc:     'Para negócios em crescimento que querem automatizar.',
    usuarios: '5 usuários',
    popular:  true,
    recursos: [
      'Tudo do Básico',
      'WhatsApp Business integrado',
      'Kango com IA completa',
      'Google Agenda sincronizado',
      'Conciliação bancária',
      'Relatórios avançados',
      'Link de agendamento público',
    ],
  },
  {
    id:    'enterprise',
    nome:  'Business',
    preco: 'R$129,90',
    desc:  'Para quem quer resultado e acompanhamento especializado.',
    usuarios: 'Usuários ilimitados',
    recursos: [
      'Tudo do Profissional',
      'Consultoria mensal com analista de dados',
      'Relatório mensal do negócio',
    ],
  },
]

export default function EscolherPlano() {
  const { empresa, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [erro, setErro] = useState('')

  const autoPlano    = searchParams.get('plano')
  const autoCheckout = searchParams.get('checkout') === '1'

  useEffect(() => {
    if (autoCheckout && autoPlano && user && !loadingPlan) {
      assinar(autoPlano)
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  async function assinar(planId) {
    setErro('')
    setLoadingPlan(planId)
    try {
      const token = await user.getIdToken()
      const res   = await fetch('/api/billing/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ planId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro || 'Erro ao iniciar pagamento.')
      window.location.href = data.url
    } catch (err) {
      setErro(err.message)
      setLoadingPlan(null)
    }
  }

  const planoAtual = empresa?.plano

  return (
    <div className="min-h-screen bg-bg px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="font-bricolage text-2xl font-semibold text-text mb-2">
            Escolha seu plano
          </h1>
          <p className="text-text-2 text-sm">
            Cancele quando quiser. Sem taxas de adesão.
          </p>
        </div>

        {erro && (
          <p className="text-sm text-late-text bg-late-bg border border-late-text/20 rounded-md px-4 py-2 mb-6 text-center">
            {erro}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANOS.map(plano => {
            const ativo = planoAtual === plano.id
            return (
              <div
                key={plano.id}
                className={`relative bg-surface border rounded-xl p-6 flex flex-col ${
                  plano.popular
                    ? 'border-ink shadow-md'
                    : 'border-border'
                }`}
              >
                {plano.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-ink text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Mais popular
                  </span>
                )}

                <div className="mb-4">
                  <h2 className="font-bricolage text-lg font-semibold text-text mb-1">{plano.nome}</h2>
                  <p className="text-text-3 text-xs leading-relaxed">{plano.desc}</p>
                </div>

                <div className="mb-4">
                  <span className="font-mono text-3xl font-medium text-text">{plano.preco}</span>
                  <span className="text-text-3 text-sm">/mês</span>
                  <p className="text-text-3 text-xs mt-1">{plano.usuarios}</p>
                </div>

                <ul className="flex flex-col gap-2 mb-6 flex-1">
                  {plano.recursos.map(r => (
                    <li key={r} className="flex items-start gap-2 text-sm text-text">
                      <Check size={14} className="text-ink mt-0.5 shrink-0" strokeWidth={2.5} />
                      {r}
                    </li>
                  ))}
                </ul>

                {ativo ? (
                  <div className="w-full text-center py-2.5 rounded-md bg-ink-light border border-border text-ink text-sm font-medium">
                    Plano atual
                  </div>
                ) : (
                  <button
                    onClick={() => assinar(plano.id)}
                    disabled={!!loadingPlan}
                    className={`w-full py-2.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
                      plano.popular
                        ? 'bg-ink hover:bg-blue-hover text-white'
                        : 'border border-border hover:border-border-strong text-text hover:bg-ink-light'
                    }`}
                  >
                    {loadingPlan === plano.id ? 'Aguarde...' : 'Assinar'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-center text-text-3 text-xs mt-8">
          Pagamento seguro via Stripe. Cartão de crédito.
        </p>

        {planoAtual && (
          <div className="text-center mt-4">
            <button
              onClick={() => navigate('/')}
              className="text-text-3 text-sm hover:text-text transition-colors"
            >
              Voltar ao painel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
