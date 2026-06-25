import { useState } from 'react'
import { ChevronDown, Mail } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

function WhatsAppIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#25D366" d="M4.868 43.303l2.694-9.835C5.9 30.59 5.026 27.324 5.027 23.979 5.032 13.514 13.548 5 24.014 5c5.079.002 9.845 1.979 13.43 5.566 3.584 3.588 5.558 8.356 5.556 13.428-.004 10.465-8.522 18.98-18.986 18.98h-.008c-3.177-.001-6.3-.798-9.073-2.311L4.868 43.303z"/>
      <path fill="#fff" d="M19.671 18.715c-.236-.525-.484-.536-.709-.545-.184-.008-.394-.007-.604-.007-.21 0-.552.079-.842.394-.288.315-1.103 1.079-1.103 2.631 0 1.552 1.129 3.053 1.285 3.263.157.21 2.195 3.494 5.4 4.762 2.671 1.055 3.213.846 3.793.793.579-.052 1.867-.763 2.131-1.5.263-.737.263-1.369.184-1.5-.079-.131-.289-.21-.604-.368-.315-.157-1.866-.92-2.155-1.026-.289-.105-.499-.157-.71.158-.21.315-.814 1.026-.999 1.236-.184.21-.368.236-.683.079-.315-.157-1.328-.489-2.531-1.561-.936-.834-1.568-1.864-1.752-2.179-.184-.315-.02-.486.138-.643.142-.141.315-.368.473-.552.157-.184.21-.315.315-.526.105-.21.053-.394-.026-.552-.656-1.578-1.31-3.154-1.726-4.312z"/>
    </svg>
  )
}

const FAQ = [
  {
    pergunta: 'Como adiciono um novo cliente?',
    resposta: 'Clique no botão "Novo cliente" no topo da tela de Clientes. Preencha nome e telefone — os demais campos são opcionais.',
  },
  {
    pergunta: 'Como registro um atendimento?',
    resposta: 'Abra o perfil do cliente clicando no nome dele. Na seção "Histórico de atendimentos", clique em "Registrar atendimento" e preencha os dados.',
  },
  {
    pergunta: 'O que são as etapas do cliente?',
    resposta: 'As etapas representam o estágio do cliente no seu processo: Novo, Contato, Proposta, Fechado ou Perdido. Você pode alterar a etapa na página do cliente.',
  },
  {
    pergunta: 'Como funciona a Kango?',
    resposta: 'A Kango é sua assistente de dados da SATTA. Clique no botão no canto inferior direito e faça perguntas sobre seus clientes, receita e funil de vendas.',
  },
  {
    pergunta: 'Meus dados estão seguros?',
    resposta: 'Sim. Os dados são armazenados no Firebase com regras de segurança que garantem que somente você acessa suas informações. A conexão é sempre criptografada.',
  },
  {
    pergunta: 'Como altero minha senha?',
    resposta: 'No momento, a alteração de senha é feita pelo link "Esqueci minha senha" na tela de login. Em breve disponibilizaremos essa opção dentro do CRM.',
  },
]

function ItemFAQ({ pergunta, resposta }) {
  const [aberto, setAberto] = useState(false)

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setAberto(a => !a)}
        className="w-full flex items-center justify-between py-4 text-left gap-4 group"
      >
        <span className="text-sm font-medium text-navy group-hover:text-blue transition-colors">
          {pergunta}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-soft shrink-0 transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`}
        />
      </button>
      {aberto && (
        <p className="text-sm text-slate-soft pb-4 leading-relaxed pr-6">
          {resposta}
        </p>
      )}
    </div>
  )
}

export default function Suporte() {
  const { user, empresa } = useAuth()

  const msgWhatsApp = encodeURIComponent(
    `Olá! Preciso de suporte com a SATTA.\n\n` +
    `Nome: ${user?.displayName || 'Não informado'}\n` +
    `E-mail: ${user?.email || 'Não informado'}\n` +
    `Empresa: ${empresa?.nome || 'Não informado'}\n\n` +
    `Motivo do contato: `
  )

  const msgEmail = encodeURIComponent(
    `Nome: ${user?.displayName || ''}\n` +
    `E-mail: ${user?.email || ''}\n` +
    `Empresa: ${empresa?.nome || ''}\n\n` +
    `Descreva aqui sua dúvida ou problema:`
  )

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Suporte</h1>
        <p className="text-slate-soft text-sm mt-1">Dúvidas frequentes e canais de atendimento</p>
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-2xl border border-border p-6 mb-6">
        <h2 className="text-sm font-semibold text-navy mb-1">Dúvidas frequentes</h2>
        <p className="text-xs text-slate-soft mb-5">Respostas para as perguntas mais comuns</p>
        <div>
          {FAQ.map(item => (
            <ItemFAQ key={item.pergunta} {...item} />
          ))}
        </div>
      </div>

      {/* Contato */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <h2 className="text-sm font-semibold text-navy mb-1">Falar com a Satta</h2>
        <p className="text-xs text-slate-soft mb-5">Não encontrou o que precisava? Entre em contato diretamente.</p>

        <div className="space-y-3">
          <a
            href={`https://wa.me/5511976280255?text=${msgWhatsApp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-blue hover:bg-blue-light transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center shrink-0">
              <WhatsAppIcon size={22} />
            </div>
            <div>
              <p className="text-sm font-medium text-navy group-hover:text-blue transition-colors">WhatsApp</p>
              <p className="text-xs text-slate-soft mt-0.5">(11) 97628-0255</p>
            </div>
          </a>

          <a
            href={`mailto:contato@sattaanalytics.com.br?subject=Suporte%20Satta%20CRM&body=${msgEmail}`}
            className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-blue hover:bg-blue-light transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-light flex items-center justify-center shrink-0">
              <Mail size={18} className="text-blue" />
            </div>
            <div>
              <p className="text-sm font-medium text-navy group-hover:text-blue transition-colors">E-mail</p>
              <p className="text-xs text-slate-soft mt-0.5">contato@sattaanalytics.com.br</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}
