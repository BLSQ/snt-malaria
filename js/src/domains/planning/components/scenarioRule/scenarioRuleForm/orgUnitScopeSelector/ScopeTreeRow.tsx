import React, { FC, MouseEvent, useCallback } from 'react';
import { Check, Close, ExpandMore, Remove } from '@mui/icons-material';
import { Box, Tooltip, useTheme } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../../../messages';
import { ruleFormColors } from '../styles';
import { ScopeAggregate, ScopeKind, ScopeTreeNode } from './types';

const countPill = {
    display: 'inline-flex',
    alignItems: 'center',
    height: 20,
    px: 1,
    borderRadius: 999,
    fontWeight: 'bold',
};

const styles = {
    boxIcon: {
        fontSize: 16,
    },
    branchMeta: {
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        typography: 'caption',
        color: 'text.secondary',
        fontVariantNumeric: 'tabular-nums',
    },
    handpickedPill: {
        ...countPill,
        backgroundColor: 'primary.main',
        color: 'common.white',
    },
    excludedPill: {
        ...countPill,
        backgroundColor: ruleFormColors.excludedBackground,
        color: 'error.dark',
    },
} satisfies SxStyles;

type Props = {
    node: ScopeTreeNode;
    depth: number;
    aggregate: ScopeAggregate;
    kind?: ScopeKind;
    hasCriteria: boolean;
    isOpen: boolean;
    onToggleOpen: () => void;
    onToggleSelection: () => void;
};

export const ScopeTreeRow: FC<Props> = ({
    node,
    depth,
    aggregate,
    kind,
    hasCriteria,
    isOpen,
    onToggleOpen,
    onToggleSelection,
}) => {
    const theme = useTheme();
    const { formatMessage } = useSafeIntl();
    const hasChildren = node.children.length > 0;
    const isBranchFull =
        !node.isLeaf &&
        aggregate.total > 0 &&
        aggregate.scope === aggregate.total;
    const isBranchPartial =
        !node.isLeaf && !isBranchFull && aggregate.scope > 0;
    const isExcluded = node.isLeaf && kind === 'exc';
    const isHandpicked = node.isLeaf && kind === 'hand';
    const isRuleMatch = node.isLeaf && kind === 'rule';

    let boxColor: string | undefined;
    let rowBackgroundColor = 'transparent';
    let tooltip = formatMessage(MESSAGES.scopeLeafUnselectedTooltip);
    if (!node.isLeaf) {
        boxColor = aggregate.scope > 0 ? ruleFormColors.ruleMatch : undefined;
        tooltip = formatMessage(
            aggregate.scope > 0
                ? MESSAGES.scopeBranchExcludeAllTooltip
                : MESSAGES.scopeBranchIncludeAllTooltip,
        );
    } else if (isExcluded) {
        boxColor = theme.palette.error.main;
        rowBackgroundColor = ruleFormColors.excludedBackground;
        tooltip = formatMessage(MESSAGES.scopeLeafExcludedTooltip);
    } else if (isHandpicked) {
        boxColor = theme.palette.primary.main;
        rowBackgroundColor = theme.palette.primary.light;
        tooltip = formatMessage(MESSAGES.scopeLeafHandpickedTooltip);
    } else if (isRuleMatch) {
        boxColor = ruleFormColors.ruleMatch;
        tooltip = formatMessage(MESSAGES.scopeLeafRuleTooltip);
    }

    const handleCheckboxClick = useCallback(
        (event: MouseEvent) => {
            event.stopPropagation();
            onToggleSelection();
        },
        [onToggleSelection],
    );

    const rowStyles = {
        row: {
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            height: 36,
            pl: `${8 + depth * 20}px`,
            pr: 1.5,
            cursor: hasChildren ? 'pointer' : 'default',
            backgroundColor: rowBackgroundColor,
            '&:hover': hasChildren
                ? { backgroundColor: theme.palette.action.hover }
                : undefined,
        },
        caret: {
            width: 22,
            height: 22,
            flex: '0 0 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.secondary',
            visibility: hasChildren ? 'visible' : 'hidden',
            transform: isOpen ? 'none' : 'rotate(-90deg)',
            transition: 'transform 150ms',
        },
        box: {
            flex: '0 0 18px',
            width: 18,
            height: 18,
            boxSizing: 'border-box',
            borderRadius: '2px',
            border: `2px solid ${boxColor ?? theme.palette.text.secondary}`,
            backgroundColor: boxColor ?? 'transparent',
            color: theme.palette.common.white,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
        },
        label: {
            flex: '1 1 auto',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            typography: 'body2',
            fontWeight: node.isLeaf ? 'regular' : 'medium',
            color: isExcluded ? 'text.secondary' : 'text.primary',
            textDecoration: isExcluded ? 'line-through' : 'none',
        },
    } satisfies SxStyles;

    return (
        <Box
            sx={rowStyles.row}
            onClick={hasChildren ? onToggleOpen : undefined}
        >
            <Box sx={rowStyles.caret}>
                <ExpandMore fontSize="small" />
            </Box>
            <Tooltip title={tooltip} placement="left" disableInteractive>
                <Box sx={rowStyles.box} onClick={handleCheckboxClick}>
                    {isExcluded && <Close sx={styles.boxIcon} />}
                    {(isHandpicked || isRuleMatch || isBranchFull) && (
                        <Check sx={styles.boxIcon} />
                    )}
                    {isBranchPartial && <Remove sx={styles.boxIcon} />}
                </Box>
            </Tooltip>
            <Box sx={rowStyles.label}>{node.name}</Box>
            {!node.isLeaf && (
                <Box sx={styles.branchMeta}>
                    <span>
                        {aggregate.scope}/{aggregate.total}
                    </span>
                    {hasCriteria && aggregate.hand > 0 && (
                        <Box component="span" sx={styles.handpickedPill}>
                            +{aggregate.hand}
                        </Box>
                    )}
                    {hasCriteria && aggregate.exc > 0 && (
                        <Box component="span" sx={styles.excludedPill}>
                            −{aggregate.exc}
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    );
};
