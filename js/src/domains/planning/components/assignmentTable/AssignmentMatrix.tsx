import React, { FC, MouseEvent, useCallback, useMemo, useState } from 'react';
import { Table, TableBody, TableContainer, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';
import { CostLineValueField } from '../../libs/override-utils';
import { AssignmentMatrixHeader } from './AssignmentMatrixHeader';
import { AssignmentMatrixRow } from './AssignmentMatrixRow';
import {
    crosshairTint,
    DISTRICT_COLUMN_WIDTH,
    getColumnWidth,
    getRuleDotSize,
} from './assignmentTableLayout';
import {
    AssignmentColumnGroup,
    AssignmentRow,
    AssignmentTableMode,
    flattenColumns,
} from './buildAssignmentTable';
import { useAssignmentCellText } from './useAssignmentCellText';

const styles = {
    container: {
        flex: '1 1 auto',
        minHeight: 0,
        overflow: 'auto',
    },
    table: {
        width: '100%',
        borderCollapse: 'separate',
        borderSpacing: 0,
    },
    noResults: {
        py: 4,
        px: 2,
        textAlign: 'center',
        color: 'text.secondary',
    },
} satisfies SxStyles;

const getHoveredColumnStyles = (hoveredColumn: number | undefined) =>
    hoveredColumn === undefined
        ? undefined
        : {
              [`& td[data-column="${hoveredColumn}"]`]: {
                  backgroundImage: crosshairTint,
              },
          };

type Props = {
    groups: AssignmentColumnGroup[];
    rows: AssignmentRow[];
    mode: AssignmentTableMode;
    field: CostLineValueField;
    year: number;
    currency: string;
    isRuleView: boolean;
    query: string;
    onQueryChange: (query: string) => void;
};

export const AssignmentMatrix: FC<Props> = ({
    groups,
    rows,
    mode,
    field,
    year,
    currency,
    isRuleView,
    query,
    onQueryChange,
}) => {
    const { formatMessage } = useSafeIntl();
    const isCostItems = mode === 'costItems';
    const [hoveredColumn, setHoveredColumn] = useState<number | undefined>();
    const columns = useMemo(() => flattenColumns(groups), [groups]);
    const { formatValue, formatTooltip } = useAssignmentCellText({
        mode,
        field,
        year,
        currency,
        isRuleView,
    });

    const handleMouseOver = useCallback((event: MouseEvent) => {
        const cell = (event.target as HTMLElement).closest('[data-column]');
        const column = cell?.getAttribute('data-column');
        setHoveredColumn(column ? Number(column) : undefined);
    }, []);
    const handleMouseLeave = useCallback(() => setHoveredColumn(undefined), []);

    return (
        <TableContainer sx={styles.container} onMouseLeave={handleMouseLeave}>
            <Table size="small" stickyHeader sx={styles.table}>
                <colgroup>
                    <col style={{ width: DISTRICT_COLUMN_WIDTH }} />
                    {columns.map(({ column }) => (
                        <col
                            key={column.key}
                            style={{
                                width: getColumnWidth(
                                    isCostItems && Boolean(column.costLine),
                                ),
                            }}
                        />
                    ))}
                    <col />
                </colgroup>
                <AssignmentMatrixHeader
                    groups={groups}
                    columns={columns}
                    isCostItems={isCostItems}
                    hoveredColumn={hoveredColumn}
                    query={query}
                    onQueryChange={onQueryChange}
                />
                <TableBody
                    onMouseOver={handleMouseOver}
                    sx={getHoveredColumnStyles(hoveredColumn)}
                >
                    {rows.map(row => (
                        <AssignmentMatrixRow
                            key={row.orgUnitId}
                            row={row}
                            columns={columns}
                            isCostItems={isCostItems}
                            showRuleDot={!isRuleView}
                            ruleDotSize={getRuleDotSize(mode)}
                            formatValue={formatValue}
                            formatTooltip={formatTooltip}
                        />
                    ))}
                </TableBody>
            </Table>
            {rows.length === 0 && (
                <Typography variant="body2" sx={styles.noResults}>
                    {formatMessage(MESSAGES.assignmentTableNoResults)}
                </Typography>
            )}
        </TableContainer>
    );
};
