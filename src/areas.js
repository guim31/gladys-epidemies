// -----------------------------------------------------------------------------
// The areas the Sentinelles network publishes: the 13 regions of metropolitan
// France (INSEE codes, regions since 2016, "RDD" level of the API) and the
// whole of metropolitan France ("FR", "PAY" level). The overseas regions are
// not covered by the network. The code is the platform id of the device: it
// never changes.
// -----------------------------------------------------------------------------

export const NATIONAL = 'FR';

export const AREAS = [
  {
    code: '84',
    names: {
      en: 'Auvergne-Rhône-Alpes',
      fr: 'Auvergne-Rhône-Alpes',
      de: 'Auvergne-Rhône-Alpes',
      es: 'Auvernia-Ródano-Alpes',
    },
  },
  {
    code: '27',
    names: {
      en: 'Bourgogne-Franche-Comté',
      fr: 'Bourgogne-Franche-Comté',
      de: 'Bourgogne-Franche-Comté',
      es: 'Borgoña-Franco Condado',
    },
  },
  { code: '53', names: { en: 'Brittany', fr: 'Bretagne', de: 'Bretagne', es: 'Bretaña' } },
  {
    code: '24',
    names: {
      en: 'Centre-Val de Loire',
      fr: 'Centre-Val de Loire',
      de: 'Centre-Val de Loire',
      es: 'Centro-Valle de Loira',
    },
  },
  { code: '94', names: { en: 'Corsica', fr: 'Corse', de: 'Korsika', es: 'Córcega' } },
  { code: '44', names: { en: 'Grand Est', fr: 'Grand Est', de: 'Grand Est', es: 'Gran Este' } },
  {
    code: '32',
    names: {
      en: 'Hauts-de-France',
      fr: 'Hauts-de-France',
      de: 'Hauts-de-France',
      es: 'Altos de Francia',
    },
  },
  {
    code: '11',
    names: { en: 'Île-de-France', fr: 'Île-de-France', de: 'Île-de-France', es: 'Isla de Francia' },
  },
  { code: '28', names: { en: 'Normandy', fr: 'Normandie', de: 'Normandie', es: 'Normandía' } },
  {
    code: '75',
    names: {
      en: 'Nouvelle-Aquitaine',
      fr: 'Nouvelle-Aquitaine',
      de: 'Nouvelle-Aquitaine',
      es: 'Nueva Aquitania',
    },
  },
  { code: '76', names: { en: 'Occitania', fr: 'Occitanie', de: 'Okzitanien', es: 'Occitania' } },
  {
    code: '52',
    names: {
      en: 'Pays de la Loire',
      fr: 'Pays de la Loire',
      de: 'Pays de la Loire',
      es: 'País del Loira',
    },
  },
  {
    code: '93',
    names: {
      en: "Provence-Alpes-Côte d'Azur",
      fr: "Provence-Alpes-Côte d'Azur",
      de: "Provence-Alpes-Côte d'Azur",
      es: 'Provenza-Alpes-Costa Azul',
    },
  },
  {
    code: NATIONAL,
    names: {
      en: 'Metropolitan France',
      fr: 'France métropolitaine',
      de: 'Frankreich (Festland)',
      es: 'Francia metropolitana',
    },
  },
];

const BY_CODE = new Map(AREAS.map((area) => [area.code, area]));

/** The area of a code ("84", "FR"), or null. */
export function areaOf(code) {
  return BY_CODE.get(String(code ?? '').trim()) ?? null;
}

/** Level of the API that publishes an area: "PAY" for France, "RDD" for a region. */
export function levelOf(code) {
  return code === NATIONAL ? 'PAY' : 'RDD';
}

/** Name of an area in a language (French by default). */
export function areaName(code, language = 'fr') {
  const area = areaOf(code);
  return area ? (area.names[language] ?? area.names.fr) : String(code);
}
