/**
 * Static IATA airport code → IANA timezone string mapping.
 * Covers ~500 major airports worldwide.
 */
export const airportTimezones: Record<string, string> = {
  // India
  BOM: 'Asia/Kolkata', DEL: 'Asia/Kolkata', MAA: 'Asia/Kolkata',
  BLR: 'Asia/Kolkata', CCU: 'Asia/Kolkata', HYD: 'Asia/Kolkata',
  COK: 'Asia/Kolkata', AMD: 'Asia/Kolkata', PNQ: 'Asia/Kolkata',
  GOI: 'Asia/Kolkata', JAI: 'Asia/Kolkata', LKO: 'Asia/Kolkata',
  IXC: 'Asia/Kolkata', ATQ: 'Asia/Kolkata', PAT: 'Asia/Kolkata',
  VNS: 'Asia/Kolkata', NAG: 'Asia/Kolkata', IDR: 'Asia/Kolkata',
  BHO: 'Asia/Kolkata', SXR: 'Asia/Kolkata', IXB: 'Asia/Kolkata',
  GAU: 'Asia/Kolkata', BBI: 'Asia/Kolkata', VTZ: 'Asia/Kolkata',
  TRV: 'Asia/Kolkata', IXM: 'Asia/Kolkata', CJB: 'Asia/Kolkata',
  TRZ: 'Asia/Kolkata', IXR: 'Asia/Kolkata', RPR: 'Asia/Kolkata',
  BDQ: 'Asia/Kolkata', STV: 'Asia/Kolkata', UDR: 'Asia/Kolkata',
  JDH: 'Asia/Kolkata', JSA: 'Asia/Kolkata', JLR: 'Asia/Kolkata',
  DIB: 'Asia/Kolkata', TEZ: 'Asia/Kolkata', IMF: 'Asia/Kolkata',
  IXA: 'Asia/Kolkata', IXL: 'Asia/Kolkata', IXS: 'Asia/Kolkata',

  // UAE
  DXB: 'Asia/Dubai', AUH: 'Asia/Dubai', SHJ: 'Asia/Dubai',
  AAN: 'Asia/Dubai', RKT: 'Asia/Dubai', DWC: 'Asia/Dubai',

  // Middle East
  DOH: 'Asia/Qatar', KWI: 'Asia/Kuwait', BAH: 'Asia/Bahrain',
  RUH: 'Asia/Riyadh', JED: 'Asia/Riyadh', MED: 'Asia/Riyadh',
  DMM: 'Asia/Riyadh', TIF: 'Asia/Riyadh', MCT: 'Asia/Muscat',
  SLL: 'Asia/Muscat', AMM: 'Asia/Amman', BEY: 'Asia/Beirut',
  TLV: 'Asia/Jerusalem', BGW: 'Asia/Baghdad', BSR: 'Asia/Baghdad',
  IKA: 'Asia/Tehran', THR: 'Asia/Tehran', MHD: 'Asia/Tehran',
  KBL: 'Asia/Kabul', TAS: 'Asia/Tashkent', ALA: 'Asia/Almaty',
  TSE: 'Asia/Almaty', GYD: 'Asia/Baku', TBS: 'Asia/Tbilisi',
  EVN: 'Asia/Yerevan', ASB: 'Asia/Ashgabat', DYU: 'Asia/Dushanbe',

  // UK & Ireland
  LHR: 'Europe/London', LGW: 'Europe/London', STN: 'Europe/London',
  LTN: 'Europe/London', LCY: 'Europe/London', MAN: 'Europe/London',
  BHX: 'Europe/London', GLA: 'Europe/London', EDI: 'Europe/London',
  BRS: 'Europe/London', NCL: 'Europe/London', LPL: 'Europe/London',
  LBA: 'Europe/London', ABZ: 'Europe/London', INV: 'Europe/London',
  DUB: 'Europe/Dublin', SNN: 'Europe/Dublin', ORK: 'Europe/Dublin',
  BFS: 'Europe/London',

  // France
  CDG: 'Europe/Paris', ORY: 'Europe/Paris', LYS: 'Europe/Paris',
  MRS: 'Europe/Paris', NCE: 'Europe/Paris', TLS: 'Europe/Paris',
  BOD: 'Europe/Paris', NTE: 'Europe/Paris', SXB: 'Europe/Paris',
  MPL: 'Europe/Paris', BIQ: 'Europe/Paris', BES: 'Europe/Paris',

  // Germany
  FRA: 'Europe/Berlin', MUC: 'Europe/Berlin', BER: 'Europe/Berlin',
  DUS: 'Europe/Berlin', HAM: 'Europe/Berlin', STR: 'Europe/Berlin',
  CGN: 'Europe/Berlin', NUE: 'Europe/Berlin', HAJ: 'Europe/Berlin',
  LEJ: 'Europe/Berlin', DRS: 'Europe/Berlin', FMO: 'Europe/Berlin',
  BRE: 'Europe/Berlin', PAD: 'Europe/Berlin',

  // Netherlands
  AMS: 'Europe/Amsterdam', EIN: 'Europe/Amsterdam', RTM: 'Europe/Amsterdam',
  MST: 'Europe/Amsterdam', GRQ: 'Europe/Amsterdam',

  // Switzerland
  ZRH: 'Europe/Zurich', GVA: 'Europe/Zurich', BSL: 'Europe/Zurich',
  BRN: 'Europe/Zurich', LUZ: 'Europe/Zurich',

  // Italy
  FCO: 'Europe/Rome', MXP: 'Europe/Rome', LIN: 'Europe/Rome',
  VCE: 'Europe/Rome', NAP: 'Europe/Rome', PSA: 'Europe/Rome',
  BLQ: 'Europe/Rome', PMO: 'Europe/Rome', CTA: 'Europe/Rome',
  TRN: 'Europe/Rome', FLR: 'Europe/Rome', BRI: 'Europe/Rome',
  BGY: 'Europe/Rome', TSF: 'Europe/Rome',

  // Spain
  MAD: 'Europe/Madrid', BCN: 'Europe/Madrid', PMI: 'Europe/Madrid',
  AGP: 'Europe/Madrid', ALC: 'Europe/Madrid', VLC: 'Europe/Madrid',
  SVQ: 'Europe/Madrid', BIO: 'Europe/Madrid', SDR: 'Europe/Madrid',
  ZAZ: 'Europe/Madrid', GRX: 'Europe/Madrid', OVD: 'Europe/Madrid',
  TFS: 'Atlantic/Canary', LPA: 'Atlantic/Canary', FUE: 'Atlantic/Canary',
  ACE: 'Atlantic/Canary', SPC: 'Atlantic/Canary', TFN: 'Atlantic/Canary',

  // Portugal
  LIS: 'Europe/Lisbon', OPO: 'Europe/Lisbon', FAO: 'Europe/Lisbon',
  FNC: 'Atlantic/Madeira', PDL: 'Atlantic/Azores', HOR: 'Atlantic/Azores',

  // Greece
  ATH: 'Europe/Athens', SKG: 'Europe/Athens', HER: 'Europe/Athens',
  RHO: 'Europe/Athens', CFU: 'Europe/Athens', CHQ: 'Europe/Athens',
  JTR: 'Europe/Athens', KGS: 'Europe/Athens', ZTH: 'Europe/Athens',
  MJT: 'Europe/Athens', EFL: 'Europe/Athens', JSI: 'Europe/Athens',
  KIT: 'Europe/Athens', AOK: 'Europe/Athens',

  // Turkey
  IST: 'Europe/Istanbul', SAW: 'Europe/Istanbul', ADB: 'Europe/Istanbul',
  ESB: 'Europe/Istanbul', AYT: 'Europe/Istanbul', DLM: 'Europe/Istanbul',
  BJV: 'Europe/Istanbul', TZX: 'Europe/Istanbul', KYA: 'Europe/Istanbul',
  GZP: 'Europe/Istanbul',

  // Scandinavia
  CPH: 'Europe/Copenhagen', AAR: 'Europe/Copenhagen', BLL: 'Europe/Copenhagen',
  ARN: 'Europe/Stockholm', GOT: 'Europe/Stockholm', MMX: 'Europe/Stockholm',
  NYO: 'Europe/Stockholm', UME: 'Europe/Stockholm',
  OSL: 'Europe/Oslo', BGO: 'Europe/Oslo', TRD: 'Europe/Oslo',
  SVG: 'Europe/Oslo', BOO: 'Europe/Oslo', TOS: 'Europe/Oslo',
  HEL: 'Europe/Helsinki', TMP: 'Europe/Helsinki', TKU: 'Europe/Helsinki',
  OUL: 'Europe/Helsinki', RVN: 'Europe/Helsinki',
  REK: 'Atlantic/Reykjavik', KEF: 'Atlantic/Reykjavik',

  // Belgium & Luxembourg
  BRU: 'Europe/Brussels', CRL: 'Europe/Brussels', LGG: 'Europe/Brussels',
  LUX: 'Europe/Luxembourg',

  // Austria
  VIE: 'Europe/Vienna', GRZ: 'Europe/Vienna', INN: 'Europe/Vienna',
  SZG: 'Europe/Vienna', KLU: 'Europe/Vienna',

  // Poland
  WAW: 'Europe/Warsaw', KRK: 'Europe/Warsaw', GDN: 'Europe/Warsaw',
  KTW: 'Europe/Warsaw', POZ: 'Europe/Warsaw', WRO: 'Europe/Warsaw',
  LCJ: 'Europe/Warsaw', RZE: 'Europe/Warsaw',

  // Czech Republic & Slovakia
  PRG: 'Europe/Prague', BRQ: 'Europe/Prague',
  BTS: 'Europe/Bratislava', KSC: 'Europe/Bratislava',

  // Hungary
  BUD: 'Europe/Budapest', DEB: 'Europe/Budapest',

  // Romania & Bulgaria
  OTP: 'Europe/Bucharest', CLJ: 'Europe/Bucharest', IAS: 'Europe/Bucharest',
  SOF: 'Europe/Sofia', VAR: 'Europe/Sofia', BOJ: 'Europe/Sofia',

  // Croatia & Slovenia & Serbia
  ZAG: 'Europe/Zagreb', DBV: 'Europe/Zagreb', SPU: 'Europe/Zagreb',
  PUY: 'Europe/Zagreb', ZAD: 'Europe/Zagreb',
  LJU: 'Europe/Ljubljana',
  BEG: 'Europe/Belgrade', INI: 'Europe/Belgrade',

  // Ukraine & Belarus & Moldova
  KBP: 'Europe/Kyiv', LWO: 'Europe/Kyiv', ODS: 'Europe/Kyiv',
  MSQ: 'Europe/Minsk',
  KIV: 'Europe/Chisinau',

  // Russia
  SVO: 'Europe/Moscow', DME: 'Europe/Moscow', VKO: 'Europe/Moscow',
  SHE: 'Europe/Moscow', LED: 'Europe/Moscow', KZN: 'Europe/Moscow',
  ROV: 'Europe/Moscow', UFA: 'Asia/Yekaterinburg', SVX: 'Asia/Yekaterinburg',
  OVB: 'Asia/Novosibirsk', KRR: 'Europe/Moscow', AER: 'Europe/Moscow',
  IKT: 'Asia/Irkutsk', VVO: 'Asia/Vladivostok',

  // Africa — North
  CAI: 'Africa/Cairo', HRG: 'Africa/Cairo', SSH: 'Africa/Cairo',
  LXR: 'Africa/Cairo', CMN: 'Africa/Casablanca', RAK: 'Africa/Casablanca',
  AGA: 'Africa/Casablanca', TUN: 'Africa/Tunis', ALG: 'Africa/Algiers',
  TIP: 'Africa/Tripoli', KRT: 'Africa/Khartoum',

  // Africa — West
  LOS: 'Africa/Lagos', ABV: 'Africa/Lagos', ACC: 'Africa/Accra',
  DKR: 'Africa/Dakar', ABJ: 'Africa/Abidjan', CON: 'Africa/Conakry',
  OUA: 'Africa/Ouagadougou', BKO: 'Africa/Bamako',

  // Africa — East
  NBO: 'Africa/Nairobi', MBA: 'Africa/Nairobi', ADD: 'Africa/Addis_Ababa',
  DAR: 'Africa/Dar_es_Salaam', JRO: 'Africa/Dar_es_Salaam',
  ZNZ: 'Africa/Dar_es_Salaam', KGL: 'Africa/Kigali',
  EBB: 'Africa/Kampala', DJI: 'Africa/Djibouti',
  MGQ: 'Africa/Mogadishu', ASM: 'Africa/Asmara',

  // Africa — South
  JNB: 'Africa/Johannesburg', CPT: 'Africa/Johannesburg',
  DUR: 'Africa/Johannesburg', PLZ: 'Africa/Johannesburg',
  GRJ: 'Africa/Johannesburg', ELS: 'Africa/Johannesburg',
  LUN: 'Africa/Lusaka', HRE: 'Africa/Harare', BLZ: 'Africa/Blantyre',
  FIH: 'Africa/Kinshasa', LAD: 'Africa/Luanda', WDH: 'Africa/Windhoek',
  GBE: 'Africa/Gaborone', MTS: 'Africa/Mbabane',

  // Africa — Islands
  MRU: 'Indian/Mauritius', RUN: 'Indian/Reunion',
  SEZ: 'Indian/Mahe', MLE: 'Indian/Maldives', HAH: 'Indian/Comoro',
  TNR: 'Indian/Antananarivo', MJN: 'Indian/Antananarivo',

  // South Asia
  CMB: 'Asia/Colombo', HRI: 'Asia/Colombo',
  KTM: 'Asia/Kathmandu', PKR: 'Asia/Kathmandu',
  DAC: 'Asia/Dhaka', CGP: 'Asia/Dhaka', ZYL: 'Asia/Dhaka',
  KHI: 'Asia/Karachi', LHE: 'Asia/Karachi', ISB: 'Asia/Karachi',
  PEW: 'Asia/Karachi', SKT: 'Asia/Karachi', LYP: 'Asia/Karachi',
  MUX: 'Asia/Karachi',

  // Southeast Asia — Singapore
  SIN: 'Asia/Singapore',

  // Southeast Asia — Malaysia
  KUL: 'Asia/Kuala_Lumpur', PEN: 'Asia/Kuala_Lumpur', LGK: 'Asia/Kuala_Lumpur',
  BKI: 'Asia/Kuching', KCH: 'Asia/Kuching', MYY: 'Asia/Kuching',

  // Southeast Asia — Indonesia
  CGK: 'Asia/Jakarta', DPS: 'Asia/Makassar', SUB: 'Asia/Jakarta',
  UPG: 'Asia/Makassar', PLM: 'Asia/Jakarta', BDO: 'Asia/Jakarta',
  JOG: 'Asia/Jakarta', SOC: 'Asia/Jakarta', BTH: 'Asia/Jakarta',
  AMQ: 'Asia/Jayapura', DJJ: 'Asia/Jayapura',

  // Southeast Asia — Philippines
  MNL: 'Asia/Manila', CEB: 'Asia/Manila', DVO: 'Asia/Manila',
  ILO: 'Asia/Manila', KLO: 'Asia/Manila', ZAM: 'Asia/Manila',

  // Southeast Asia — Thailand
  BKK: 'Asia/Bangkok', DMK: 'Asia/Bangkok', CNX: 'Asia/Bangkok',
  HKT: 'Asia/Bangkok', USM: 'Asia/Bangkok', HDY: 'Asia/Bangkok',

  // Southeast Asia — Vietnam
  HAN: 'Asia/Ho_Chi_Minh', SGN: 'Asia/Ho_Chi_Minh', DAD: 'Asia/Ho_Chi_Minh',
  CXR: 'Asia/Ho_Chi_Minh', HPH: 'Asia/Ho_Chi_Minh',

  // Southeast Asia — Others
  PNH: 'Asia/Phnom_Penh', REP: 'Asia/Phnom_Penh',
  VTE: 'Asia/Vientiane', PKZ: 'Asia/Vientiane',
  RGN: 'Asia/Rangoon', MDL: 'Asia/Rangoon',
  BWN: 'Asia/Brunei',

  // East Asia — Hong Kong & Macau
  HKG: 'Asia/Hong_Kong', MFM: 'Asia/Macau',

  // East Asia — China
  PEK: 'Asia/Shanghai', PVG: 'Asia/Shanghai', SHA: 'Asia/Shanghai',
  CAN: 'Asia/Shanghai', CTU: 'Asia/Shanghai', SZX: 'Asia/Shanghai',
  WUH: 'Asia/Shanghai', XIY: 'Asia/Shanghai', CKG: 'Asia/Shanghai',
  KMG: 'Asia/Shanghai', HGH: 'Asia/Shanghai', NKG: 'Asia/Shanghai',
  TNA: 'Asia/Shanghai', HAK: 'Asia/Shanghai', XMN: 'Asia/Shanghai',
  CGO: 'Asia/Shanghai', SYX: 'Asia/Shanghai', DLC: 'Asia/Shanghai',
  HET: 'Asia/Shanghai', TSN: 'Asia/Shanghai',
  NGB: 'Asia/Shanghai', WNZ: 'Asia/Shanghai', FOC: 'Asia/Shanghai',
  LHW: 'Asia/Shanghai', KWE: 'Asia/Shanghai', NNG: 'Asia/Shanghai',
  URC: 'Asia/Urumqi',

  // East Asia — Taiwan
  TPE: 'Asia/Taipei', KHH: 'Asia/Taipei', RMQ: 'Asia/Taipei',

  // East Asia — Japan
  NRT: 'Asia/Tokyo', HND: 'Asia/Tokyo', KIX: 'Asia/Tokyo',
  NGO: 'Asia/Tokyo', CTS: 'Asia/Tokyo', FUK: 'Asia/Tokyo',
  OKA: 'Asia/Tokyo', SPK: 'Asia/Tokyo', ITM: 'Asia/Tokyo',
  HIJ: 'Asia/Tokyo', KOJ: 'Asia/Tokyo', KMJ: 'Asia/Tokyo',

  // East Asia — South Korea
  ICN: 'Asia/Seoul', GMP: 'Asia/Seoul', PUS: 'Asia/Seoul',
  CJU: 'Asia/Seoul', TAE: 'Asia/Seoul',

  // North Asia
  ULN: 'Asia/Ulaanbaatar',

  // Oceania — Australia
  SYD: 'Australia/Sydney', MEL: 'Australia/Melbourne', BNE: 'Australia/Brisbane',
  PER: 'Australia/Perth', ADL: 'Australia/Adelaide', HBA: 'Australia/Hobart',
  CBR: 'Australia/Sydney', DRW: 'Australia/Darwin', CNS: 'Australia/Brisbane',
  OOL: 'Australia/Brisbane', MCY: 'Australia/Brisbane', TSV: 'Australia/Brisbane',
  MKY: 'Australia/Brisbane', ROK: 'Australia/Brisbane', LST: 'Australia/Hobart',

  // Oceania — New Zealand
  AKL: 'Pacific/Auckland', CHC: 'Pacific/Auckland', WLG: 'Pacific/Auckland',
  DUD: 'Pacific/Auckland', ZQN: 'Pacific/Auckland',

  // Oceania — Pacific Islands
  NAN: 'Pacific/Fiji', APW: 'Pacific/Apia',
  PPT: 'Pacific/Tahiti', RAR: 'Pacific/Rarotonga', INU: 'Pacific/Nauru',
  HIR: 'Pacific/Guadalcanal', VLI: 'Pacific/Efate', NOU: 'Pacific/Noumea',

  // North America — USA East
  JFK: 'America/New_York', LGA: 'America/New_York', EWR: 'America/New_York',
  BOS: 'America/New_York', PHL: 'America/New_York', DCA: 'America/New_York',
  IAD: 'America/New_York', BWI: 'America/New_York', ATL: 'America/New_York',
  MIA: 'America/New_York', FLL: 'America/New_York', MCO: 'America/New_York',
  TPA: 'America/New_York', CLT: 'America/New_York', RDU: 'America/New_York',
  PIT: 'America/New_York', BDL: 'America/New_York', SYR: 'America/New_York',
  BUF: 'America/New_York', ROC: 'America/New_York', PWM: 'America/New_York',
  CVG: 'America/New_York', CMH: 'America/New_York', CLE: 'America/New_York',
  PBI: 'America/New_York', RSW: 'America/New_York', JAX: 'America/New_York',
  SAV: 'America/New_York', CHS: 'America/New_York', RIC: 'America/New_York',
  ORF: 'America/New_York', DTW: 'America/Detroit',

  // North America — USA Central
  ORD: 'America/Chicago', MDW: 'America/Chicago', MSP: 'America/Chicago',
  MKE: 'America/Chicago', STL: 'America/Chicago', MSY: 'America/Chicago',
  HOU: 'America/Chicago', IAH: 'America/Chicago', DFW: 'America/Chicago',
  DAL: 'America/Chicago', SAT: 'America/Chicago', AUS: 'America/Chicago',
  OMA: 'America/Chicago', MCI: 'America/Chicago', DSM: 'America/Chicago',
  IND: 'America/Indiana/Indianapolis', BNA: 'America/Chicago',
  MEM: 'America/Chicago', LIT: 'America/Chicago', TUL: 'America/Chicago',
  OKC: 'America/Chicago', BHM: 'America/Chicago', HSV: 'America/Chicago',
  MSO: 'America/Denver',

  // North America — USA Mountain / West
  DEN: 'America/Denver', SLC: 'America/Denver', ABQ: 'America/Denver',
  ELP: 'America/Denver', BOI: 'America/Boise',
  PHX: 'America/Phoenix', TUS: 'America/Phoenix',
  LAX: 'America/Los_Angeles', SFO: 'America/Los_Angeles',
  SJC: 'America/Los_Angeles', OAK: 'America/Los_Angeles',
  SEA: 'America/Los_Angeles', PDX: 'America/Los_Angeles',
  LAS: 'America/Los_Angeles', SAN: 'America/Los_Angeles',
  SMF: 'America/Los_Angeles', BUR: 'America/Los_Angeles',
  ONT: 'America/Los_Angeles', SNA: 'America/Los_Angeles',
  SBA: 'America/Los_Angeles', RNO: 'America/Los_Angeles',
  PSP: 'America/Los_Angeles', FAT: 'America/Los_Angeles',
  GEG: 'America/Los_Angeles',

  // Hawaii & Alaska
  HNL: 'Pacific/Honolulu', OGG: 'Pacific/Honolulu', KOA: 'Pacific/Honolulu',
  LIH: 'Pacific/Honolulu', ITO: 'Pacific/Honolulu',
  ANC: 'America/Anchorage', FAI: 'America/Anchorage', JNU: 'America/Anchorage',

  // Canada
  YYZ: 'America/Toronto', YVR: 'America/Vancouver', YUL: 'America/Toronto',
  YOW: 'America/Toronto', YEG: 'America/Edmonton', YYC: 'America/Edmonton',
  YHZ: 'America/Halifax', YWG: 'America/Winnipeg', YQB: 'America/Toronto',
  YYJ: 'America/Vancouver', YXE: 'America/Regina', YXY: 'America/Whitehorse',
  YZF: 'America/Yellowknife',

  // Mexico
  MEX: 'America/Mexico_City', CUN: 'America/Cancun', GDL: 'America/Mexico_City',
  MTY: 'America/Monterrey', SJD: 'America/Mazatlan', MZT: 'America/Mazatlan',
  PVR: 'America/Mexico_City', HUX: 'America/Mexico_City', ZIH: 'America/Mexico_City',
  TLC: 'America/Mexico_City', AGU: 'America/Mexico_City',

  // Caribbean
  NAS: 'America/Nassau', MBJ: 'America/Jamaica', KIN: 'America/Jamaica',
  SXM: 'America/Lower_Princes', PUJ: 'America/Santo_Domingo',
  SDQ: 'America/Santo_Domingo', BGI: 'America/Barbados', ANU: 'America/Antigua',
  SJU: 'America/Puerto_Rico', STT: 'America/St_Thomas', GCM: 'America/Cayman',
  HAV: 'America/Havana', STX: 'America/St_Thomas',
  EIS: 'America/Tortola', TAB: 'America/Port_of_Spain',
  POS: 'America/Port_of_Spain',

  // Central America
  GUA: 'America/Guatemala', SJO: 'America/Costa_Rica', SAL: 'America/El_Salvador',
  TGU: 'America/Tegucigalpa', MGA: 'America/Managua',
  PTY: 'America/Panama', BLB: 'America/Panama',

  // South America
  GRU: 'America/Sao_Paulo', GIG: 'America/Sao_Paulo', BSB: 'America/Sao_Paulo',
  FOR: 'America/Fortaleza', REC: 'America/Recife', SSA: 'America/Bahia',
  POA: 'America/Sao_Paulo', CWB: 'America/Sao_Paulo', BEL: 'America/Belem',
  MAO: 'America/Manaus', CGH: 'America/Sao_Paulo', VCP: 'America/Sao_Paulo',
  NAT: 'America/Fortaleza', MCZ: 'America/Maceio', THE: 'America/Fortaleza',
  EZE: 'America/Argentina/Buenos_Aires', AEP: 'America/Argentina/Buenos_Aires',
  COR: 'America/Argentina/Cordoba', MDZ: 'America/Argentina/Mendoza',
  SCL: 'America/Santiago', PMC: 'America/Santiago',
  LIM: 'America/Lima', CUZ: 'America/Lima',
  BOG: 'America/Bogota', MDE: 'America/Bogota', CLO: 'America/Bogota',
  UIO: 'America/Guayaquil', GYE: 'America/Guayaquil',
  CCS: 'America/Caracas', MAR: 'America/Caracas',
  MVD: 'America/Montevideo', ASU: 'America/Asuncion',
  LPB: 'America/La_Paz', CBB: 'America/La_Paz', SCZ: 'America/Santa_Cruz',
  GEO: 'America/Guyana', PBM: 'America/Paramaribo',
};

export function getAirportTimezone(iataCode: string): string {
  return airportTimezones[iataCode.toUpperCase()] ?? 'UTC';
}
