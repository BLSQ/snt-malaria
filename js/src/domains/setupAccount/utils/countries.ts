// WHO malaria endemic countries (ISO 3166-1 alpha-2). Frontend-only: the
// backend still accepts any ISO code. Labels are resolved at runtime via
// `Intl.DisplayNames`.
export const COUNTRY_CODES: string[] = [
    // Africa
    'AO', 'BF', 'BI', 'BJ', 'BW', 'CD', 'CF', 'CG', 'CI', 'CM',
    'DJ', 'ER', 'ET', 'GA', 'GH', 'GM', 'GN', 'GQ', 'GW', 'KE',
    'KM', 'LR', 'MG', 'ML', 'MR', 'MW', 'MZ', 'NA', 'NE', 'NG',
    'RW', 'SD', 'SL', 'SN', 'SO', 'SS', 'ST', 'SZ', 'TD', 'TG',
    'TZ', 'UG', 'ZA', 'ZM', 'ZW',
    // Asia / MENA
    'AF', 'BD', 'BT', 'ID', 'IN', 'IR', 'KH', 'KP', 'LA', 'MM',
    'MY', 'NP', 'PH', 'PK', 'SA', 'TH', 'TL', 'VN', 'YE',
    // Americas
    'BO', 'BR', 'CO', 'CR', 'DO', 'EC', 'GT', 'GY', 'HN', 'HT',
    'MX', 'NI', 'PA', 'PE', 'SR', 'VE',
    // Pacific
    'PG', 'SB', 'VU',
];

type CountryOption = { value: string; label: string };

export const getCountryOptions = (locale: string): CountryOption[] => {
    let displayNames: Intl.DisplayNames | undefined;
    try {
        displayNames = new Intl.DisplayNames([locale], { type: 'region' });
    } catch {
        displayNames = undefined;
    }
    return COUNTRY_CODES.map(code => ({
        value: code,
        label: displayNames?.of(code) ?? code,
    })).sort((a, b) => a.label.localeCompare(b.label, locale));
};
