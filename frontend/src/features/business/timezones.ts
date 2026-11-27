/**
 * Fusos do Brasil (sem horário de verão desde 2019). Cada um representa todas as
 * cidades com o mesmo horário; o valor é o identificador IANA aceito pela API.
 */
export const BRAZIL_TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'Horário de Brasília (UTC−3)' },
  { value: 'America/Manaus', label: 'Amazonas, MT, MS, RO e RR (UTC−4)' },
  { value: 'America/Rio_Branco', label: 'Acre (UTC−5)' },
  { value: 'America/Noronha', label: 'Fernando de Noronha (UTC−2)' },
] as const
