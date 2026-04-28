const TEAM_METADATA = {
  ARI: {
    id: 109,
    abbreviation: 'ARI',
    aliases: ['ARI'],
    name: 'Arizona Diamondbacks',
    shortName: 'Diamondbacks',
    city: 'Phoenix',
    founded: 1998,
    primaryColor: '#A71930',
    secondaryColor: '#000000',
  },
  ATL: {
    id: 144,
    abbreviation: 'ATL',
    aliases: ['ATL'],
    name: 'Atlanta Braves',
    shortName: 'Braves',
    city: 'Atlanta',
    founded: 1871,
    primaryColor: '#CE1141',
    secondaryColor: '#13274F',
  },
  BAL: {
    id: 110,
    abbreviation: 'BAL',
    aliases: ['BAL'],
    name: 'Baltimore Orioles',
    shortName: 'Orioles',
    city: 'Baltimore',
    founded: 1901,
    primaryColor: '#DF4601',
    secondaryColor: '#000000',
  },
  BOS: {
    id: 111,
    abbreviation: 'BOS',
    aliases: ['BOS'],
    name: 'Boston Red Sox',
    shortName: 'Red Sox',
    city: 'Boston',
    founded: 1901,
    primaryColor: '#BD3039',
    secondaryColor: '#0C2340',
  },
  CHC: {
    id: 112,
    abbreviation: 'CHC',
    aliases: ['CHC'],
    name: 'Chicago Cubs',
    shortName: 'Cubs',
    city: 'Chicago',
    founded: 1876,
    primaryColor: '#0E3386',
    secondaryColor: '#CC3433',
  },
  CWS: {
    id: 145,
    abbreviation: 'CWS',
    aliases: ['CWS', 'CHW'],
    name: 'Chicago White Sox',
    shortName: 'White Sox',
    city: 'Chicago',
    founded: 1901,
    primaryColor: '#27251F',
    secondaryColor: '#C4CED4',
  },
  CIN: {
    id: 113,
    abbreviation: 'CIN',
    aliases: ['CIN'],
    name: 'Cincinnati Reds',
    shortName: 'Reds',
    city: 'Cincinnati',
    founded: 1881,
    primaryColor: '#C6011F',
    secondaryColor: '#000000',
  },
  CLE: {
    id: 114,
    abbreviation: 'CLE',
    aliases: ['CLE'],
    name: 'Cleveland Guardians',
    shortName: 'Guardians',
    city: 'Cleveland',
    founded: 1901,
    primaryColor: '#E31937',
    secondaryColor: '#0C2340',
  },
  COL: {
    id: 115,
    abbreviation: 'COL',
    aliases: ['COL'],
    name: 'Colorado Rockies',
    shortName: 'Rockies',
    city: 'Denver',
    founded: 1993,
    primaryColor: '#33006F',
    secondaryColor: '#C4CED4',
  },
  DET: {
    id: 116,
    abbreviation: 'DET',
    aliases: ['DET'],
    name: 'Detroit Tigers',
    shortName: 'Tigers',
    city: 'Detroit',
    founded: 1901,
    primaryColor: '#0C2340',
    secondaryColor: '#FA4616',
  },
  HOU: {
    id: 117,
    abbreviation: 'HOU',
    aliases: ['HOU'],
    name: 'Houston Astros',
    shortName: 'Astros',
    city: 'Houston',
    founded: 1962,
    primaryColor: '#002D62',
    secondaryColor: '#EB6E1F',
  },
  KC: {
    id: 118,
    abbreviation: 'KC',
    aliases: ['KC', 'KCR'],
    name: 'Kansas City Royals',
    shortName: 'Royals',
    city: 'Kansas City',
    founded: 1969,
    primaryColor: '#004687',
    secondaryColor: '#BD9B60',
  },
  LAA: {
    id: 108,
    abbreviation: 'LAA',
    aliases: ['LAA', 'ANA'],
    name: 'Los Angeles Angels',
    shortName: 'Angels',
    city: 'Anaheim',
    founded: 1961,
    primaryColor: '#BA0021',
    secondaryColor: '#003263',
  },
  LAD: {
    id: 119,
    abbreviation: 'LAD',
    aliases: ['LAD'],
    name: 'Los Angeles Dodgers',
    shortName: 'Dodgers',
    city: 'Los Angeles',
    founded: 1883,
    primaryColor: '#005A9C',
    secondaryColor: '#FFFFFF',
  },
  MIA: {
    id: 146,
    abbreviation: 'MIA',
    aliases: ['MIA', 'FLA'],
    name: 'Miami Marlins',
    shortName: 'Marlins',
    city: 'Miami',
    founded: 1993,
    primaryColor: '#00A3E0',
    secondaryColor: '#41748D',
  },
  MIL: {
    id: 158,
    abbreviation: 'MIL',
    aliases: ['MIL'],
    name: 'Milwaukee Brewers',
    shortName: 'Brewers',
    city: 'Milwaukee',
    founded: 1969,
    primaryColor: '#12284B',
    secondaryColor: '#FFC52F',
  },
  MIN: {
    id: 142,
    abbreviation: 'MIN',
    aliases: ['MIN'],
    name: 'Minnesota Twins',
    shortName: 'Twins',
    city: 'Minneapolis',
    founded: 1901,
    primaryColor: '#002B5C',
    secondaryColor: '#D31145',
  },
  NYM: {
    id: 121,
    abbreviation: 'NYM',
    aliases: ['NYM'],
    name: 'New York Mets',
    shortName: 'Mets',
    city: 'New York',
    founded: 1962,
    primaryColor: '#002D72',
    secondaryColor: '#FF5910',
  },
  NYY: {
    id: 147,
    abbreviation: 'NYY',
    aliases: ['NYY'],
    name: 'New York Yankees',
    shortName: 'Yankees',
    city: 'New York',
    founded: 1903,
    primaryColor: '#0C2340',
    secondaryColor: '#C4CED4',
  },
  OAK: {
    id: 133,
    abbreviation: 'OAK',
    aliases: ['OAK', 'ATH'],
    name: 'Athletics',
    shortName: 'Athletics',
    city: 'Sacramento',
    founded: 1901,
    primaryColor: '#003831',
    secondaryColor: '#EFB21E',
  },
  PHI: {
    id: 143,
    abbreviation: 'PHI',
    aliases: ['PHI'],
    name: 'Philadelphia Phillies',
    shortName: 'Phillies',
    city: 'Philadelphia',
    founded: 1883,
    primaryColor: '#E81828',
    secondaryColor: '#002D72',
  },
  PIT: {
    id: 134,
    abbreviation: 'PIT',
    aliases: ['PIT'],
    name: 'Pittsburgh Pirates',
    shortName: 'Pirates',
    city: 'Pittsburgh',
    founded: 1881,
    primaryColor: '#27251F',
    secondaryColor: '#FDB827',
  },
  SD: {
    id: 135,
    abbreviation: 'SD',
    aliases: ['SD', 'SDP'],
    name: 'San Diego Padres',
    shortName: 'Padres',
    city: 'San Diego',
    founded: 1969,
    primaryColor: '#2F241D',
    secondaryColor: '#FFC425',
  },
  SF: {
    id: 137,
    abbreviation: 'SF',
    aliases: ['SF', 'SFG'],
    name: 'San Francisco Giants',
    shortName: 'Giants',
    city: 'San Francisco',
    founded: 1883,
    primaryColor: '#FD5A1E',
    secondaryColor: '#27251F',
  },
  SEA: {
    id: 136,
    abbreviation: 'SEA',
    aliases: ['SEA'],
    name: 'Seattle Mariners',
    shortName: 'Mariners',
    city: 'Seattle',
    founded: 1977,
    primaryColor: '#0C2C56',
    secondaryColor: '#005C5C',
  },
  STL: {
    id: 138,
    abbreviation: 'STL',
    aliases: ['STL'],
    name: 'St. Louis Cardinals',
    shortName: 'Cardinals',
    city: 'St. Louis',
    founded: 1882,
    primaryColor: '#C41E3A',
    secondaryColor: '#0C2340',
  },
  TB: {
    id: 139,
    abbreviation: 'TB',
    aliases: ['TB', 'TBR'],
    name: 'Tampa Bay Rays',
    shortName: 'Rays',
    city: 'St. Petersburg',
    founded: 1998,
    primaryColor: '#092C5C',
    secondaryColor: '#8FBCE6',
  },
  TEX: {
    id: 140,
    abbreviation: 'TEX',
    aliases: ['TEX'],
    name: 'Texas Rangers',
    shortName: 'Rangers',
    city: 'Arlington',
    founded: 1961,
    primaryColor: '#003278',
    secondaryColor: '#C0111F',
  },
  TOR: {
    id: 141,
    abbreviation: 'TOR',
    aliases: ['TOR'],
    name: 'Toronto Blue Jays',
    shortName: 'Blue Jays',
    city: 'Toronto',
    founded: 1977,
    primaryColor: '#134A8E',
    secondaryColor: '#1D2D5C',
  },
  WSN: {
    id: 120,
    abbreviation: 'WSN',
    aliases: ['WSN', 'WSH'],
    name: 'Washington Nationals',
    shortName: 'Nationals',
    city: 'Washington',
    founded: 1969,
    primaryColor: '#AB0003',
    secondaryColor: '#14225A',
  },
};

const TEAM_NAME_TO_ABBR = Object.values(TEAM_METADATA).reduce((acc, team) => {
  acc[team.name] = team.abbreviation;
  acc[team.shortName] = team.abbreviation;
  return acc;
}, {});

const TEAM_ID_TO_ABBR = Object.values(TEAM_METADATA).reduce((acc, team) => {
  acc[team.id] = team.abbreviation;
  return acc;
}, {});

export function normalizeTeamAbbreviation(value) {
  if (!value) {
    return '';
  }

  const upperValue = String(value).trim().toUpperCase();
  if (TEAM_METADATA[upperValue]) {
    return upperValue;
  }

  const match = Object.values(TEAM_METADATA).find((team) => team.aliases.includes(upperValue));
  return match?.abbreviation || upperValue;
}

export function getTeamAbbreviationFromName(name) {
  if (!name) {
    return '';
  }

  return TEAM_NAME_TO_ABBR[name] || '';
}

export function getTeamAbbreviationFromId(teamId) {
  if (teamId == null) {
    return '';
  }

  return TEAM_ID_TO_ABBR[Number(teamId)] || '';
}

export function getTeamMetaByAbbr(abbreviation) {
  const normalized = normalizeTeamAbbreviation(abbreviation);
  return TEAM_METADATA[normalized] || null;
}

export function getTeamMetaById(teamId) {
  const abbreviation = getTeamAbbreviationFromId(teamId);
  return getTeamMetaByAbbr(abbreviation);
}

export function getTeamLogoUrl(teamId) {
  if (!teamId) {
    return '';
  }

  return `https://www.mlbstatic.com/team-logos/${teamId}.svg`;
}

export function getTeamColor(abbreviation, fallback = '#6c757d') {
  return getTeamMetaByAbbr(abbreviation)?.primaryColor || fallback;
}

export function getTeamShortName(value) {
  if (!value) {
    return '';
  }

  const metaByAbbr = getTeamMetaByAbbr(value);
  if (metaByAbbr) {
    return metaByAbbr.shortName;
  }

  const metaByName = getTeamMetaByAbbr(getTeamAbbreviationFromName(value));
  return metaByName?.shortName || value;
}

export function getAllTeamMetadata() {
  return TEAM_METADATA;
}

export { TEAM_METADATA };
