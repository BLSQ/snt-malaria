import React, { FC, MouseEvent, useCallback } from 'react';
import AddIcon from '@mui/icons-material/Add';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { numericValues } from 'Iaso/domains/instances/utils/intl';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';
import { CostItemGroup } from '../types';
import {
    COST_ITEMS_GRID_MIN_WIDTH,
    COST_ITEMS_HEADER_HEIGHT,
} from './costItemsGrid';

type Props = {
    group: CostItemGroup;
    isOpen: boolean;
    onToggle: (interventionId: number) => void;
    onAdd: (group: CostItemGroup) => void;
};

const styles = {
    header: {
        position: 'sticky',
        top: COST_ITEMS_HEADER_HEIGHT,
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        minWidth: COST_ITEMS_GRID_MIN_WIDTH,
        py: 0.75,
        pl: 1.5,
        pr: 2,
        backgroundColor: 'grey.100',
        borderLeft: '3px solid',
        borderLeftColor: 'rgba(31, 43, 61, 0.24)',
        cursor: 'pointer',
        '&:hover': {
            backgroundImage: theme =>
                `linear-gradient(${theme.palette.action.selected}, ${theme.palette.action.selected})`,
        },
    },
    chevron: {
        display: 'flex',
        color: 'text.secondary',
        transition: 'transform 150ms',
    },
    chevronOpen: { transform: 'rotate(90deg)' },
    name: { fontWeight: 'medium', flexShrink: 0, pl: 0.25 },
    category: {
        color: 'text.secondary',
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    count: { color: 'text.secondary', whiteSpace: 'nowrap' },
    add: {
        ml: 2,
        width: 24,
        height: 24,
        color: 'primary.main',
        backgroundColor: 'primary.light',
        '&:hover': {
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
        },
    },
} satisfies SxStyles;

export const CostItemGroupHeader: FC<Props> = ({
    group,
    isOpen,
    onToggle,
    onAdd,
}) => {
    const { formatMessage } = useSafeIntl();

    const handleToggle = useCallback(
        () => onToggle(group.intervention.id),
        [onToggle, group.intervention.id],
    );
    const handleAdd = useCallback(
        (event: MouseEvent) => {
            event.stopPropagation();
            onAdd(group);
        },
        [onAdd, group],
    );

    return (
        <Box sx={styles.header} onClick={handleToggle}>
            <Box
                component="span"
                sx={
                    isOpen
                        ? { ...styles.chevron, ...styles.chevronOpen }
                        : styles.chevron
                }
            >
                <ChevronRightIcon fontSize="small" />
            </Box>
            <Typography variant="body2" sx={styles.name}>
                {group.intervention.name}
            </Typography>
            <Typography variant="caption" sx={styles.category}>
                {group.interventionCategory.name}
            </Typography>
            <Typography variant="caption" sx={styles.count}>
                {formatMessage(
                    MESSAGES.costItemsCount,
                    numericValues({ count: group.visibleLines.length }),
                )}
            </Typography>
            <Tooltip
                title={formatMessage(MESSAGES.addCostItemTo, {
                    intervention: group.intervention.name,
                })}
            >
                <IconButton
                    size="small"
                    sx={styles.add}
                    onClick={handleAdd}
                    aria-label={formatMessage(
                        MESSAGES.addInterventionCostBreakdownLine,
                    )}
                >
                    <AddIcon sx={{ fontSize: 18 }} />
                </IconButton>
            </Tooltip>
        </Box>
    );
};
