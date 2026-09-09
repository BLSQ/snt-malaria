import { REQUIRED_METRIC_VALUES_HEADERS } from './constants';

export type GridRow = {
    orgUnitId: number;
    adm1Name: string;
    adm2Name: string;
    /** Raw text as typed; empty string means "no value". */
    value: string;
};

const escapeCell = (cell: string | number): string => {
    const text = String(cell ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** `ADM1_NAME,ADM2_NAME,ADM2_ID,<code>` — the `code` is escaped like any other
 *  cell (the field only forbids whitespace, so a comma is possible). */
const headerRow = (code: string): string =>
    [...REQUIRED_METRIC_VALUES_HEADERS, escapeCell(code)].join(',');

/**
 * Serialise the manual-entry grid into the same column format the CSV import
 * endpoint (`/api/metricvalues/import_from_csv/`) expects. Rows whose value is
 * blank are dropped so they don't clear anything on the server.
 */
export const csvFromGrid = (rows: GridRow[], code: string): string => {
    const body = rows
        .filter(row => row.value.trim() !== '')
        .map(row =>
            [
                escapeCell(row.adm1Name),
                escapeCell(row.adm2Name),
                escapeCell(row.orgUnitId),
                escapeCell(row.value.trim()),
            ].join(','),
        );
    return [headerRow(code), ...body].join('\n');
};

export const gridCsvFile = (rows: GridRow[], code: string): File =>
    new File([csvFromGrid(rows, code)], 'manual-entry.csv', {
        type: 'text/csv',
    });

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

/**
 * Read back a template-shaped CSV for the Legend-step preview: `{ orgUnitId, value }`
 * for every row whose `<code>` cell is filled.
 */
export const parseTemplateCsv = (
    text: string,
    code: string,
): { orgUnitId: number; value: string }[] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];
    const delimiter =
        lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
    const headers = splitCsvLine(lines[0], delimiter);
    const idIndex = headers.indexOf('ADM2_ID');
    const valueIndex = headers.indexOf(code);
    if (idIndex === -1 || valueIndex === -1) return [];
    const rows: { orgUnitId: number; value: string }[] = [];
    for (const line of lines.slice(1)) {
        const cells = splitCsvLine(line, delimiter);
        const orgUnitId = Number(cells[idIndex]);
        const value = (cells[valueIndex] ?? '').trim();
        if (Number.isFinite(orgUnitId) && value !== '') {
            rows.push({ orgUnitId, value });
        }
    }
    return rows;
};

/**
 * An import template for a layer that does not exist yet: the shared org-unit
 * headers plus the new layer's `code` column, one blank-value row per org unit.
 * The generic `/api/metricvalues/csv_template/` only lists metric types already
 * saved, so the wizard builds this itself.
 */
export const templateCsv = (
    rows: Pick<GridRow, 'orgUnitId' | 'adm1Name' | 'adm2Name'>[],
    code: string,
): string => {
    const body = rows.map(row =>
        [
            escapeCell(row.adm1Name),
            escapeCell(row.adm2Name),
            escapeCell(row.orgUnitId),
            '',
        ].join(','),
    );
    return [headerRow(code), ...body].join('\n');
};
