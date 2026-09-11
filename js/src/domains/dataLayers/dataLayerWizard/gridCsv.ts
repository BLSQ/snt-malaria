import { REQUIRED_METRIC_VALUES_HEADERS } from './constants';
import { OrgUnitRow } from './orgUnitRows';

const escapeCell = (cell: string | number): string => {
    const text = String(cell ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** `ADM1_NAME,ADM2_NAME,ADM2_ID,<year1>,<year2>,...` — one column per year, since
 *  the wizard only ever deals with a single layer's values. */
const headerRow = (years: number[]): string =>
    [...REQUIRED_METRIC_VALUES_HEADERS, ...years.map(String)].join(',');

/**
 * An import template for a layer that does not exist yet: the shared org-unit
 * headers plus one blank-value column per requested year, one row per org unit.
 * The generic `/api/metricvalues/csv_template/` only lists metric types already
 * saved (and columns per layer, not per year), so the wizard builds this itself.
 */
export const templateCsv = (rows: OrgUnitRow[], years: number[]): string => {
    const body = rows.map(row =>
        [
            escapeCell(row.adm1Name),
            escapeCell(row.adm2Name),
            escapeCell(row.orgUnitId),
            ...years.map(() => ''),
        ].join(','),
    );
    return [headerRow(years), ...body].join('\n');
};

/** Split one CSV line, honouring double-quoted fields (which may contain the
 *  delimiter or escaped `""`). */
const splitCsvLine = (line: string, delimiter: string): string[] => {
    const cells: string[] = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        if (inQuotes) {
            if (char === '"' && line[i + 1] === '"') {
                cell += '"';
                i += 1;
            } else if (char === '"') {
                inQuotes = false;
            } else {
                cell += char;
            }
        } else if (char === '"') {
            inQuotes = true;
        } else if (char === delimiter) {
            cells.push(cell);
            cell = '';
        } else {
            cell += char;
        }
    }
    cells.push(cell);
    return cells.map(value => value.trim());
};

export type ParsedYearlyCsv = {
    years: number[];
    valuesByOrgUnit: Record<number, Record<number, string>>;
};

/**
 * Read a template-shaped CSV (as downloaded from `templateCsv`, or hand-edited) for
 * the wizard's table: any header column that parses as a whole number is a year;
 * rows are matched to org units by `ADM2_ID`. Used to fill the table, not to submit
 * it — nothing here talks to the backend.
 */
export const parseYearlyCsv = (text: string): ParsedYearlyCsv => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return { years: [], valuesByOrgUnit: {} };

    const delimiter =
        lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
    const headers = splitCsvLine(lines[0], delimiter);
    const idIndex = headers.indexOf('ADM2_ID');
    if (idIndex === -1) return { years: [], valuesByOrgUnit: {} };

    const yearColumns = headers
        .map((header, index) => ({ year: Number(header), index }))
        .filter(({ year }) => Number.isInteger(year));

    const valuesByOrgUnit: Record<number, Record<number, string>> = {};
    for (const line of lines.slice(1)) {
        const cells = splitCsvLine(line, delimiter);
        const orgUnitId = Number(cells[idIndex]);
        if (Number.isFinite(orgUnitId)) {
            const rowValues: Record<number, string> = {};
            yearColumns.forEach(({ year, index }) => {
                const value = (cells[index] ?? '').trim();
                if (value !== '') rowValues[year] = value;
            });
            if (Object.keys(rowValues).length > 0) {
                valuesByOrgUnit[orgUnitId] = rowValues;
            }
        }
    }

    return { years: yearColumns.map(({ year }) => year), valuesByOrgUnit };
};
