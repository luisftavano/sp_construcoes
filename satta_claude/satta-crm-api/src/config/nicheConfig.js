/**
 * Central source of truth for per-segment behaviour.
 * Controllers and the interface read this via getNicheSettings(),
 * which merges these defaults with account-level overrides.
 */
export const nicheConfig = {
  barbershop: {
    displayName: 'Barbearia',
    inventory: {
      enabled: false,
      canEnable: true,
      hint: 'Ative o estoque se você vende produtos como pomadas, óleos ou acessórios para seus clientes',
    },
    sales: { allowItemized: false, canEnable: true },
    appointments: { enabled: true },
    services: { enabled: true },
    defaultServices: ['Corte', 'Barba', 'Combo Corte + Barba', 'Pigmentação'],
    customerCustomFields: [],
    labels: {
      appointments: 'Agendamentos',
      appointmentSingular: 'Agendamento',
      agenda: 'Agenda de hoje',
      customer: 'Cliente',
      customers: 'Clientes',
    },
  },

  petshop: {
    displayName: 'Petshop',
    inventory: { enabled: true, canEnable: true, hint: null },
    sales: { allowItemized: true, canEnable: true },
    appointments: { enabled: true },
    services: { enabled: true },
    defaultServices: ['Banho', 'Tosa', 'Banho e Tosa', 'Consulta Veterinária', 'Vacinação'],
    customerCustomFields: ['petName', 'species', 'breed', 'weightKg'],
    labels: {
      appointments: 'Agendamentos',
      appointmentSingular: 'Agendamento',
      agenda: 'Agenda de hoje',
      customer: 'Tutor',
      customers: 'Tutores',
    },
  },

  clinic: {
    displayName: 'Clínica',
    inventory: {
      enabled: false,
      canEnable: true,
      hint: 'Ative o estoque se você vende materiais ou medicamentos',
    },
    sales: { allowItemized: false, canEnable: true },
    appointments: { enabled: true },
    services: { enabled: true },
    defaultServices: ['Consulta', 'Retorno', 'Limpeza', 'Avaliação'],
    customerCustomFields: ['healthInsurance', 'allergies', 'birthDate'],
    labels: {
      appointments: 'Agendamentos',
      appointmentSingular: 'Consulta',
      agenda: 'Consultas de hoje',
      customer: 'Paciente',
      customers: 'Pacientes',
    },
  },

  hotel: {
    displayName: 'Pousada / Hotel',
    inventory: {
      enabled: false,
      canEnable: true,
      hint: 'Ative o estoque se você possui loja ou frigobar para controlar produtos',
    },
    sales: { allowItemized: false, canEnable: true },
    appointments: { enabled: true },
    services: { enabled: true },
    defaultServices: ['Diária Standard', 'Diária Superior', 'Café da Manhã', 'Transfer'],
    customerCustomFields: ['documentNumber', 'checkInPreference'],
    labels: {
      appointments: 'Reservas',
      appointmentSingular: 'Reserva',
      agenda: 'Check-ins de hoje',
      customer: 'Hóspede',
      customers: 'Hóspedes',
    },
  },

  car_wash: {
    displayName: 'Lava-rápido',
    inventory: {
      enabled: false,
      canEnable: true,
      hint: 'Ative o estoque se você revende produtos automotivos',
    },
    sales: { allowItemized: false, canEnable: true },
    appointments: { enabled: true },
    services: { enabled: true },
    defaultServices: ['Lavagem Simples', 'Lavagem Completa', 'Polimento', 'Higienização Interna', 'Detalhamento'],
    customerCustomFields: ['plate', 'vehicleModel', 'vehicleColor'],
    labels: {
      appointments: 'Agendamentos',
      appointmentSingular: 'Agendamento',
      agenda: 'Agenda de hoje',
      customer: 'Cliente',
      customers: 'Clientes',
    },
  },

  beauty_salon: {
    displayName: 'Salão de Beleza',
    inventory: {
      enabled: false,
      canEnable: true,
      hint: 'Ative o estoque se você vende produtos de beleza para seus clientes',
    },
    sales: { allowItemized: false, canEnable: true },
    appointments: { enabled: true },
    services: { enabled: true },
    defaultServices: ['Escova', 'Corte Feminino', 'Coloração', 'Manicure', 'Pedicure', 'Hidratação'],
    customerCustomFields: ['skinType', 'hairType'],
    labels: {
      appointments: 'Agendamentos',
      appointmentSingular: 'Agendamento',
      agenda: 'Agenda de hoje',
      customer: 'Cliente',
      customers: 'Clientes',
    },
  },

  other: {
    displayName: 'Outro',
    inventory: { enabled: false, canEnable: true, hint: null },
    sales: { allowItemized: false, canEnable: true },
    appointments: { enabled: true },
    services: { enabled: true },
    defaultServices: [],
    customerCustomFields: [],
    labels: {
      appointments: 'Agendamentos',
      appointmentSingular: 'Agendamento',
      agenda: 'Agenda de hoje',
      customer: 'Cliente',
      customers: 'Clientes',
    },
  },
}

/** Returns the base config for a segment, falling back to 'other'. */
export function getNicheConfig(segment) {
  return nicheConfig[segment] ?? nicheConfig.other
}

/**
 * Merges the segment's defaults with the account's saved overrides.
 * Override always wins. Disabling a feature never deletes data — only hides UI.
 */
export function getNicheSettings(account) {
  const base  = getNicheConfig(account.segment)
  const over  = account.accountSettings ?? {}

  return {
    ...base,
    inventory: { ...base.inventory, ...(over.inventory ?? {}) },
    sales:     { ...base.sales,     ...(over.sales     ?? {}) },
  }
}

/** Returns display labels for a segment (used by frontend + Kango prompt). */
export function getNicheLabels(segment) {
  return getNicheConfig(segment).labels
}
