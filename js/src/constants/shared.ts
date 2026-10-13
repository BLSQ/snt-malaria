import { getYears } from 'Iaso/utils';

const FIRST_DATA_LAYER_YEAR = 2000;
const DATA_LAYER_FUTURE_YEARS = 5;

export const currentYear = new Date().getFullYear();
export const DataLayerYearOptions = getYears(
    currentYear + DATA_LAYER_FUTURE_YEARS - FIRST_DATA_LAYER_YEAR + 1,
    DATA_LAYER_FUTURE_YEARS,
    true,
).map(year => ({ label: year.toString(), value: year }));
