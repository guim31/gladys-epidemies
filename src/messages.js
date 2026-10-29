// -----------------------------------------------------------------------------
// The diseases followed and the texts the container produces, in the four
// languages of Gladys. German says "du", Spanish "usted".
// -----------------------------------------------------------------------------

// Sentinelles indicators (ids of the API) under surveillance: acute
// respiratory infections (flu, COVID-19, RSV...: the winter indicator since
// 2020), acute diarrhoea (gastroenteritis) and chickenpox. Influenza-like
// illness (indicator 3) is no longer "ongoing" for the API: left out. The key
// is stored by Gladys (feature ids, scene filters): it never changes.
export const DISEASES = [
  { key: 'ari', indicator: 25 },
  { key: 'diarrhea', indicator: 6 },
  { key: 'chickenpox', indicator: 7 },
];
export const DISEASE_KEYS = DISEASES.map((disease) => disease.key);

// Short names: feature names, widget lines, summaries.
export const DISEASE_NAMES = {
  en: {
    ari: 'Respiratory infections',
    diarrhea: 'Acute diarrhoea',
    chickenpox: 'Chickenpox',
  },
  fr: {
    ari: 'Infections respiratoires',
    diarrhea: 'Diarrhée aiguë',
    chickenpox: 'Varicelle',
  },
  de: {
    ari: 'Atemwegsinfekte',
    diarrhea: 'Akuter Durchfall',
    chickenpox: 'Windpocken',
  },
  es: {
    ari: 'Infecciones respiratorias',
    diarrhea: 'Diarrea aguda',
    chickenpox: 'Varicela',
  },
};

export const TRENDS = ['rising', 'stable', 'falling'];

export const TREND_NAMES = {
  en: { rising: 'rising', stable: 'stable', falling: 'falling' },
  fr: { rising: 'en hausse', stable: 'stable', falling: 'en baisse' },
  de: { rising: 'steigend', stable: 'stabil', falling: 'sinkend' },
  es: { rising: 'en aumento', stable: 'estable', falling: 'en descenso' },
};

// Connection statuses: setConnectionStatus receives the whole object (core 5.2+).
export const STATUS = {
  sourceDown: {
    en: 'The Sentinelles network data cannot be read for now. Retrying every hour.',
    fr: 'Les données du réseau Sentinelles sont illisibles pour le moment. Nouvel essai toutes les heures.',
    de: 'Die Daten des Sentinelles-Netzes sind gerade nicht lesbar. Neuer Versuch jede Stunde.',
    es: 'Los datos de la red Sentinelles no se pueden leer por ahora. Nuevo intento cada hora.',
  },
  rateLimited: {
    en: 'The Sentinelles API asks to wait (request limit reached). The integration waits before trying again.',
    fr: "L'API Sentinelles demande d'attendre (limite de requêtes atteinte). L'intégration patiente avant de réessayer.",
    de: 'Die Sentinelles-API bittet zu warten (Anfragelimit erreicht). Die Integration wartet vor dem nächsten Versuch.',
    es: 'La API de Sentinelles pide esperar (límite de solicitudes alcanzado). La integración espera antes de reintentar.',
  },
  initFailed: {
    en: 'The integration could not start. See its logs.',
    fr: "L'intégration n'a pas pu démarrer. Consultez ses journaux.",
    de: 'Die Integration konnte nicht starten. Sieh dir ihre Protokolle an.',
    es: 'La integración no pudo iniciarse. Consulte sus registros.',
  },
};

// Scene action summary. {area}, {week}, {list}; {name}, {value}, {trend}.
export const SUMMARY = {
  en: {
    intro: '{area}, week {week} (cases per 100,000): {list}.',
    item: '{name} {value} ({trend})',
    itemNoTrend: '{name} {value}',
    none: 'No Sentinelles data yet for {area}.',
  },
  fr: {
    intro: '{area}, semaine {week} (cas pour 100 000 habitants) : {list}.',
    item: '{name} {value} ({trend})',
    itemNoTrend: '{name} {value}',
    none: 'Pas encore de données Sentinelles pour {area}.',
  },
  de: {
    intro: '{area}, Woche {week} (Fälle pro 100.000 Einwohner): {list}.',
    item: '{name} {value} ({trend})',
    itemNoTrend: '{name} {value}',
    none: 'Noch keine Sentinelles-Daten für {area}.',
  },
  es: {
    intro: '{area}, semana {week} (casos por 100.000 habitantes): {list}.',
    item: '{name} {value} ({trend})',
    itemNoTrend: '{name} {value}',
    none: 'Aún no hay datos de Sentinelles para {area}.',
  },
};

export const fill = (text, values) =>
  Object.entries(values).reduce((out, [key, value]) => out.replaceAll(`{${key}}`, value), text);
