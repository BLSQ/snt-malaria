import { getYears } from 'Iaso/utils';

export const currentYear = new Date().getFullYear();
export const DataLayerYearOptions = getYears(
    currentYear - 2000 + 1,
    0,
    true,
).map(year => ({ label: year.toString(), value: year }));
