// Shared helper for translating doctor specialization values.
// Specializations are stored in the DB as fixed English display strings
// (e.g. "Cardiologist", "ENT") — this maps those raw values to the
// matching i18next key under `doctors.specializations.*`, so every page
// that displays a doctor's specialization renders it consistently in
// the selected language.
//
// Used by: Home.jsx, Doctors.jsx, Reminders.jsx, Register.jsx (dropdown)

export const SPECIALIZATIONS = [
  { value: 'General Physician', key: 'generalPhysician' },
  { value: 'Cardiologist', key: 'cardiologist' },
  { value: 'Dermatologist', key: 'dermatologist' },
  { value: 'Neurologist', key: 'neurologist' },
  { value: 'Orthopedic', key: 'orthopedic' },
  { value: 'Pediatrician', key: 'pediatrician' },
  { value: 'Psychiatrist', key: 'psychiatrist' },
  { value: 'ENT', key: 'ent' },
]

const SPECIALIZATION_KEY_BY_VALUE = SPECIALIZATIONS.reduce((acc, s) => {
  acc[s.value] = s.key
  return acc
}, {})

/**
 * Translates a raw specialization value from the DB using the given
 * i18next `t` function. Falls back to the General Physician translation
 * if no value is present, or to the raw string itself if it doesn't
 * match any known specialization (so nothing breaks silently if a new
 * specialization is added to the DB before this list is updated).
 */
export function translateSpecialization(t, raw) {
  if (!raw) return t('doctors.specializations.generalPhysician')
  const key = SPECIALIZATION_KEY_BY_VALUE[raw]
  return key ? t(`doctors.specializations.${key}`) : raw
}