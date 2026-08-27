import { ReactNode } from 'react';
import { MergedInterventionRow } from '../../../types/comparisonAggregation';

export const toChartData = (
    rows: MergedInterventionRow[],
): Record<string, string | number>[] =>
    rows.map(row => ({
        interventionId: row.interventionId,
        interventionLabel: row.interventionLabel,
        ...row.valueBySlotKey,
    }));

export const buildRowTooltipContent =
    (
        rows: MergedInterventionRow[],
        renderTooltip: (row: MergedInterventionRow) => ReactNode,
    ) =>
    ({ active, payload }: any): ReactNode => {
        if (!active || !payload?.length) {
            return null;
        }
        const row = rows.find(
            r => r.interventionId === payload[0].payload.interventionId,
        );
        return row ? renderTooltip(row) : null;
    };
