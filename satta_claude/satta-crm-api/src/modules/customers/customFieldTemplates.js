/**
 * Suggested custom fields per segment.
 * These are hints for the frontend form builder — not enforced server-side.
 */
export const CUSTOM_FIELD_TEMPLATES = {
  petshop: [
    { key: 'petName',   label: 'Nome do pet',  type: 'string' },
    { key: 'species',   label: 'Espécie',       type: 'string' },
    { key: 'breed',     label: 'Raça',          type: 'string' },
    { key: 'weightKg',  label: 'Peso (kg)',     type: 'number' },
  ],
  clinic: [
    { key: 'healthInsurance', label: 'Convênio',   type: 'string' },
    { key: 'allergies',       label: 'Alergias',   type: 'string' },
    { key: 'birthDate',       label: 'Nascimento', type: 'date' },
  ],
  car_wash: [
    { key: 'plate',         label: 'Placa',         type: 'string' },
    { key: 'vehicleModel',  label: 'Modelo',        type: 'string' },
    { key: 'vehicleColor',  label: 'Cor',           type: 'string' },
  ],
  hotel: [
    { key: 'checkInPreference', label: 'Preferência check-in', type: 'string' },
    { key: 'documentNumber',    label: 'RG / Passaporte',      type: 'string' },
  ],
  beauty_salon: [
    { key: 'skinType', label: 'Tipo de pele', type: 'string' },
    { key: 'hairType', label: 'Tipo de cabelo', type: 'string' },
  ],
  barbershop: [],
  other: [],
}

export function getTemplateForSegment(segment) {
  return CUSTOM_FIELD_TEMPLATES[segment] ?? []
}
