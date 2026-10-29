import React, { FC } from 'react';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';
import { CostItemGroup, LineHandler, PartialLineHandler } from '../types';
import { CostItemGroupHeader } from './CostItemGroupHeader';
import { CostItemRow } from './CostItemRow';
import {
    COST_ITEMS_COLUMNS,
    COST_ITEMS_HEADER_HEIGHT,
    costItemsRowLayout,
} from './costItemsColumns';

type Props = {
    groups: CostItemGroup[];
    isGroupOpen: (interventionId: number) => boolean;
    isAnyGroupOpen: boolean;
    onToggleGroup: (interventionId: number) => void;
    onToggleAllGroups: () => void;
    onUpdateLine: PartialLineHandler;
    onAddLine: (group: CostItemGroup) => void;
    onEditLine: LineHandler;
    onDeleteLine: LineHandler;
};

const COLUMN_LABELS = [
    { column: 'unitCost', label: MESSAGES.budgetingCostLineUnitCost },
    { column: 'unitCostCaption', label: null },
    { column: 'targetPopulation', label: MESSAGES.targetPopulationLabel },
    { column: 'factor', label: MESSAGES.costLineFactorLabel },
    { column: 'factorCaption', label: null },
    { column: 'buffer', label: MESSAGES.budgetingCostLineBuffer },
    { column: 'coverage', label: MESSAGES.coverageOrQuantityColumn },
    { column: 'actions', label: null },
] as const;

const styles = {
    scroller: {
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        px: 2,
        mb: 2,
    },
    header: {
        position: 'sticky',
        top: 0,
        zIndex: 3,
        ...costItemsRowLayout,
        height: COST_ITEMS_HEADER_HEIGHT,
        backgroundColor: 'background.paper',
        color: 'text.secondary',
        whiteSpace: 'nowrap',
    },
    headerName: {
        ...COST_ITEMS_COLUMNS.name,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
    },
    toggleAll: {
        position: 'absolute',
        left: -30,
        color: 'text.secondary',
        '&:hover': { color: 'primary.main' },
    },
    // Labels may overflow into the empty caption/actions header cells next to them.
    headerLabel: { fontWeight: 'medium' },
    empty: {
        py: 6,
        textAlign: 'center',
        color: 'text.secondary',
    },
} satisfies SxStyles;

export const CostItemsTable: FC<Props> = ({
    groups,
    isGroupOpen,
    isAnyGroupOpen,
    onToggleGroup,
    onToggleAllGroups,
    onUpdateLine,
    onAddLine,
    onEditLine,
    onDeleteLine,
}) => {
    const { formatMessage } = useSafeIntl();

    return (
        <Box sx={styles.scroller}>
            <Box sx={styles.header}>
                <Box sx={styles.headerName}>
                    <Tooltip title={formatMessage(MESSAGES.expandCollapseAll)}>
                        <IconButton
                            size="small"
                            sx={styles.toggleAll}
                            onClick={onToggleAllGroups}
                            aria-label={formatMessage(
                                MESSAGES.expandCollapseAll,
                            )}
                        >
                            {isAnyGroupOpen ? (
                                <UnfoldLessIcon fontSize="small" />
                            ) : (
                                <UnfoldMoreIcon fontSize="small" />
                            )}
                        </IconButton>
                    </Tooltip>
                    <Typography variant="caption" sx={styles.headerLabel}>
                        {formatMessage(MESSAGES.costItemColumn)}
                    </Typography>
                </Box>
                {React.Children.toArray(
                    COLUMN_LABELS.map(({ column, label }) => (
                        <Typography
                            variant="caption"
                            sx={[
                                styles.headerLabel,
                                COST_ITEMS_COLUMNS[column],
                            ]}
                        >
                            {label && formatMessage(label)}
                        </Typography>
                    )),
                )}
            </Box>
            {groups.length === 0 && (
                <Typography variant="body2" sx={styles.empty}>
                    {formatMessage(MESSAGES.noCostItems)}
                </Typography>
            )}
            {groups.map(group => {
                const isOpen = isGroupOpen(group.intervention.id);
                return (
                    <Box key={group.intervention.id}>
                        <CostItemGroupHeader
                            group={group}
                            isOpen={isOpen}
                            onToggle={onToggleGroup}
                            onAdd={onAddLine}
                        />
                        {isOpen &&
                            group.lines.map(line => (
                                <CostItemRow
                                    key={line.id}
                                    line={line}
                                    onUpdate={onUpdateLine}
                                    onEdit={onEditLine}
                                    onDelete={onDeleteLine}
                                />
                            ))}
                    </Box>
                );
            })}
        </Box>
    );
};
