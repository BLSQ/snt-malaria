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
