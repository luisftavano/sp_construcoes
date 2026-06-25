/** Nichos antigos (backward compat com dados existentes) */
export const nichos = [
  { id: 'barbearia',  label: 'Barbearia' },
  { id: 'lavarapido', label: 'Lava-rápido' },
  { id: 'consultorio',label: 'Consultório' },
  { id: 'loja',       label: 'Loja' },
  { id: 'restaurante',label: 'Restaurante' },
  { id: 'outro',      label: 'Outro' },
]

/** Segmentos novos (alinhados ao backend) */
export const segmentos = [
  { id: 'barbershop',   label: 'Barbearia' },
  { id: 'beauty_salon', label: 'Salão de beleza' },
  { id: 'petshop',      label: 'Petshop' },
  { id: 'clinic',       label: 'Clínica' },
  { id: 'hotel',        label: 'Pousada' },
  { id: 'car_wash',     label: 'Lava-rápido' },
  { id: 'restaurant',   label: 'Restaurante' },
  { id: 'other',        label: 'Outro' },
]

export const nichoLabels = {
  barbearia:    { cliente: 'Cliente',  referencia: 'Serviço preferido', agenda: 'Agenda de hoje' },
  lavarapido:   { cliente: 'Cliente',  referencia: 'Placa do veículo',  agenda: 'Agenda de hoje' },
  consultorio:  { cliente: 'Paciente', referencia: 'Convênio',          agenda: 'Atendimentos de hoje' },
  loja:         { cliente: 'Cliente',  referencia: 'Produto preferido', agenda: 'Pedidos de hoje' },
  restaurante:  { cliente: 'Cliente',  referencia: 'Mesa habitual',     agenda: 'Reservas de hoje' },
  outro:        { cliente: 'Cliente',  referencia: 'Referência',        agenda: 'Agenda de hoje' },
  // backend segment ids
  barbershop:   { cliente: 'Cliente',  referencia: 'Serviço preferido', agenda: 'Agenda de hoje' },
  beauty_salon: { cliente: 'Cliente',  referencia: 'Serviço preferido', agenda: 'Agenda de hoje' },
  petshop:      { cliente: 'Pet',      referencia: 'Raça',              agenda: 'Agenda de hoje' },
  clinic:       { cliente: 'Paciente', referencia: 'Convênio',          agenda: 'Atendimentos de hoje' },
  hotel:        { cliente: 'Hóspede',  referencia: 'Preferência',       agenda: 'Reservas de hoje' },
  car_wash:     { cliente: 'Cliente',  referencia: 'Placa',             agenda: 'Agenda de hoje' },
  restaurant:   { cliente: 'Cliente',  referencia: 'Mesa',              agenda: 'Reservas de hoje' },
  other:        { cliente: 'Cliente',  referencia: 'Referência',        agenda: 'Agenda de hoje' },
}

export const etapas = [
  { id: 'novo',     label: 'Novo',       cor: '#1E3A5F' },
  { id: 'contato',  label: 'Em contato', cor: '#3C6498' },
  { id: 'proposta', label: 'Proposta',   cor: '#8B5E0A' },
  { id: 'fechado',  label: 'Fechado',    cor: '#1A3D2B' },
  { id: 'perdido',  label: 'Perdido',    cor: '#5C1010' },
]
