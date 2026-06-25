/**
 * Message templates for preventive pattern reminders.
 * Variables: {{customerName}}, {{businessName}}, {{daysSinceLastVisit}},
 *            {{averageIntervalDays}}, {{petName}}
 *
 * Custom template per account: integrationConfig.settings.patternReminderTemplate
 * (same variable placeholders)
 */

const DEFAULT_TEMPLATES = {
  barbershop: 'Oi {{customerName}}! Tudo bem? Já faz {{daysSinceLastVisit}} dias desde o seu último corte aqui na {{businessName}}. Que tal passar para deixar o visual em dia? 😄 É só falar aqui para agendar!',

  petshop: 'Oi {{customerName}}! Como está o {{petName}}? Já está na hora do próximo banho e tosa aqui na {{businessName}}! Quer agendar um horário?',

  petshop_no_pet: 'Oi {{customerName}}! Como estão os bichinhos? Já está na hora de uma visita aqui na {{businessName}}! Quer agendar um horário?',

  clinic: 'Olá {{customerName}}! Passando para lembrar que já faz {{daysSinceLastVisit}} dias desde sua última visita à {{businessName}}. Se precisar agendar uma consulta ou retorno, estamos à disposição!',

  hotel: 'Olá {{customerName}}! Sentimos sua falta na {{businessName}}. Que tal planejar uma nova estadia? Temos disponibilidade e ficamos felizes em receber você novamente!',

  car_wash: 'Oi {{customerName}}! Seu carro já deve estar pedindo uma lavagem 😄 Faz {{daysSinceLastVisit}} dias desde a última vez aqui na {{businessName}}. Passa aqui quando quiser, a gente cuida do carro pra você!',

  beauty_salon: 'Oi {{customerName}}! Tudo bem? Já está na hora de renovar o visual! Faz {{daysSinceLastVisit}} dias desde sua última visita à {{businessName}}. Quer agendar um horário?',

  other: 'Oi {{customerName}}! Faz {{daysSinceLastVisit}} dias desde sua última visita à {{businessName}}. Que tal passarmos um tempo juntos novamente? Entre em contato para agendar!',
}

/** Interpolates {{variable}} placeholders. Missing keys become empty string. */
function interpolate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = vars[key]
    return v != null && v !== '' ? String(v) : ''
  })
}

/**
 * Returns the raw template string for the given segment and config.
 * Priority: custom config template > segment default.
 */
export function getTemplate(segment, settings = {}) {
  if (settings.patternReminderTemplate) return settings.patternReminderTemplate
  return DEFAULT_TEMPLATES[segment] ?? DEFAULT_TEMPLATES.other
}

/**
 * Builds the final message string for a customer.
 *
 * @param {string} segment  - account segment
 * @param {Object} vars
 * @param {string} vars.customerName
 * @param {string} vars.businessName
 * @param {number} vars.daysSinceLastVisit
 * @param {number} vars.averageIntervalDays
 * @param {string|null} [vars.petName]
 * @param {Object} [settings] - integrationConfig.settings
 */
export function buildPatternReminderMessage(segment, vars, settings = {}) {
  let templateKey = segment
  if (segment === 'petshop' && !vars.petName) templateKey = 'petshop_no_pet'

  const rawTemplate = settings.patternReminderTemplate
    ? settings.patternReminderTemplate
    : (DEFAULT_TEMPLATES[templateKey] ?? DEFAULT_TEMPLATES.other)

  return interpolate(rawTemplate, {
    customerName:       vars.customerName,
    businessName:       vars.businessName,
    daysSinceLastVisit: Math.round(vars.daysSinceLastVisit),
    averageIntervalDays: Math.round(vars.averageIntervalDays),
    petName:            vars.petName ?? '',
  })
}
