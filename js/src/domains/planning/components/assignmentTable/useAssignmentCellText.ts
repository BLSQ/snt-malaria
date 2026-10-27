import { useCallback } from 'react';
import { getCurrencyAffixes, useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../../../messages';
import { CostLineValueField } from '../../libs/override-utils';
import {
    AssignmentColumn,
    AssignmentTableCell,
    AssignmentTableMode,
} from './buildAssignmentTable';

export type CellValueFormatter = (
    cell: AssignmentTableCell,
    column: AssignmentColumn,
) => string;

export type CellTooltipFormatter = (
    cell: AssignmentTableCell,
    columnLabel: string,
    district: string,
    formattedValue: string,
) => string;

type Args = {
    mode: AssignmentTableMode;
    field: CostLineValueField;
    year: number;
    currency: string;
    isRuleView: boolean;
};

export const useAssignmentCellText = ({
    mode,
    field,
    year,
    currency,
    isRuleView,
}: Args): {
    formatValue: CellValueFormatter;
    formatTooltip: CellTooltipFormatter;
} => {
    const { formatMessage } = useSafeIntl();
    const isCostItems = mode === 'costItems';

    const formatValue = useCallback<CellValueFormatter>(
        (cell, column) => {
            if (!isCostItems) {
                return cell.overrideCount > 0
                    ? formatMessage(MESSAGES.overrideCount, {
                          count: cell.overrideCount,
                      })
                    : '';
            }
            if (cell.value === null || !column.costLine) {
                return '';
            }
            const number = cell.value.toLocaleString(undefined, {
                maximumFractionDigits: field === 'conversion_factor' ? 6 : 2,
                minimumFractionDigits: field === 'unit_cost' ? 2 : 0,
            });
            if (field === 'unit_cost') {
                const { prefix, suffix } = getCurrencyAffixes(currency);
                return `${prefix}${number}${suffix}`;
            }
            const isPercent =
                field === 'buffer' ||
                (field === 'coverage' && column.costLine.is_proportional);
            return isPercent ? `${number}%` : number;
        },
        [isCostItems, field, currency, formatMessage],
    );

    const formatTooltip = useCallback<CellTooltipFormatter>(
        (cell, columnLabel, district, formattedValue) => {
            const values = { column: columnLabel, district, year };
            if (!cell.rule) {
                return formatMessage(
                    isRuleView
                        ? MESSAGES.assignmentCellOutsideRule
                        : MESSAGES.assignmentCellNotAssigned,
                    values,
                );
            }
            const rule =
                isRuleView || !cell.rule.name
                    ? formatMessage(MESSAGES.assignmentTableThisRule)
                    : cell.rule.name;
            if (!cell.isDeployed) {
                return formatMessage(MESSAGES.assignmentCellNotDeployed, {
                    ...values,
                    rule,
                });
            }
            if (isCostItems && formattedValue) {
                return formatMessage(
                    cell.isRuleValue
                        ? MESSAGES.assignmentCellRuleValue
                        : MESSAGES.assignmentCellInheritedValue,
                    { ...values, rule, value: formattedValue },
                );
            }
            return formatMessage(MESSAGES.assignmentCellDeployed, {
                ...values,
                rule,
            });
        },
        [formatMessage, isCostItems, isRuleView, year],
    );

    return { formatValue, formatTooltip };
};
