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
    COST_ITEMS_GRID_COLUMNS,
    COST_ITEMS_GRID_MIN_WIDTH,
    COST_ITEMS_HEADER_HEIGHT,
    COST_ITEMS_ROW_PADDING_LEFT,
} from './costItemsGrid';

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
    MESSAGES.budgetingCostLineUnitCost,
    MESSAGES.costLineFactorLabel,
    MESSAGES.budgetingCostLineBuffer,
    MESSAGES.coverageLabel,
    null,
];

const styles = {
    scroller: {
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        px: 2,
        pb: 2,
    },
    header: {
        position: 'sticky',
        top: 0,
        zIndex: 3,
        display: 'grid',
        gridTemplateColumns: COST_ITEMS_GRID_COLUMNS,
        columnGap: 1,
        alignItems: 'center',
        minWidth: COST_ITEMS_GRID_MIN_WIDTH,
        height: COST_ITEMS_HEADER_HEIGHT,
        pr: 2,
        pl: COST_ITEMS_ROW_PADDING_LEFT,
        backgroundColor: 'background.paper',
        color: 'text.secondary',
        whiteSpace: 'nowrap',
    },
    headerName: { position: 'relative', display: 'flex', alignItems: 'center' },
    toggleAll: {
        position: 'absolute',
        left: -30,
        color: 'text.secondary',
        '&:hover': { color: 'primary.main' },
    },
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
                    COLUMN_LABELS.map(label => (
                        <Typography variant="caption" sx={styles.headerLabel}>
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
                                    group={group}
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
