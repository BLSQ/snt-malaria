import React, { FC, MouseEvent, useCallback } from 'react';
import {
    Check,
    ChevronRight,
    Close,
    ExpandMore,
    Remove,
} from '@mui/icons-material';
import { Box, alpha, useTheme } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../../../messages';
import { ScopeAggregate, ScopeKind, ScopeTreeNode } from './types';

type Props = {
    node: ScopeTreeNode;
    depth: number;
    aggregate: ScopeAggregate;
    kind?: ScopeKind;
    isOpen: boolean;
    onToggleOpen: () => void;
    onClick: () => void;
};

export const ScopeTreeRow: FC<Props> = ({
    node,
    depth,
    aggregate,
    kind,
    isOpen,
    onToggleOpen,
    onClick,
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
    const isLeafInScope = node.isLeaf && (kind === 'rule' || kind === 'hand');
    const isExcluded = node.isLeaf && kind === 'exc';
    const isRuleOnly = node.isLeaf && kind === 'rule';
    const inScope = node.isLeaf
        ? isLeafInScope
        : isBranchFull || isBranchPartial;

    const ruleColor = alpha(theme.palette.primary.main, 0.6);
    let boxColor = theme.palette.primary.main;
    if (isExcluded) {
        boxColor = theme.palette.error.main;
    } else if (isRuleOnly) {
        boxColor = ruleColor;
    }
    const boxFilled = inScope || isExcluded;
    let boxBorderColor = alpha(theme.palette.text.primary, 0.45);
    if (boxFilled) {
        boxBorderColor = isRuleOnly ? 'transparent' : boxColor;
    }

    let rowBackgroundColor = 'transparent';
    if (isExcluded) {
        rowBackgroundColor = alpha(theme.palette.error.main, 0.07);
    } else if (isLeafInScope && !isRuleOnly) {
        rowBackgroundColor = alpha(theme.palette.primary.main, 0.06);
    }

    const handleToggleOpen = useCallback(
        (event: MouseEvent) => {
            event.stopPropagation();
            onToggleOpen();
        },
        [onToggleOpen],
    );

    const styles = {
        row: {
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            height: '38px',
            pl: `${10 + depth * 22}px`,
            pr: 1,
            cursor: 'pointer',
            backgroundColor: rowBackgroundColor,
            '&:hover': { backgroundColor: theme.palette.action.hover },
        },
        caret: {
            width: '20px',
            flex: 'none',
            color: 'text.secondary',
            display: 'flex',
        },
        box: {
            flex: 'none',
            width: '18px',
            height: '18px',
            borderRadius: '2px',
            border: `2px solid ${boxBorderColor}`,
            backgroundColor: boxFilled ? boxColor : theme.palette.common.white,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        },
        label: {
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: '14px',
            fontWeight: inScope ? 500 : 400,
            color: isExcluded ? 'text.disabled' : 'text.primary',
            textDecoration: isExcluded ? 'line-through' : 'none',
        },
        typeLabel: {
            color: 'text.disabled',
            fontWeight: 400,
        },
        meta: {
            flex: 'none',
            fontSize: '11px',
            color: 'text.disabled',
            whiteSpace: 'nowrap',
        },
    } satisfies SxStyles;

    return (
        <Box sx={styles.row} onClick={onClick}>
            <Box
                sx={styles.caret}
                onClick={hasChildren ? handleToggleOpen : undefined}
            >
                {hasChildren &&
                    (isOpen ? (
                        <ExpandMore fontSize="small" />
                    ) : (
                        <ChevronRight fontSize="small" />
                    ))}
            </Box>
            <Box sx={styles.box}>
                {isExcluded && (
                    <Close style={{ fontSize: 14, color: '#fff' }} />
                )}
                {!isExcluded && isLeafInScope && (
                    <Check style={{ fontSize: 14, color: '#fff' }} />
                )}
                {!node.isLeaf && isBranchFull && (
                    <Check style={{ fontSize: 14, color: '#fff' }} />
                )}
                {!node.isLeaf && isBranchPartial && (
                    <Remove style={{ fontSize: 14, color: '#fff' }} />
                )}
            </Box>
            <Box sx={styles.label}>
                {node.name}{' '}
                <Box component="span" sx={styles.typeLabel}>
                    ({node.orgUnitTypeName})
                </Box>
            </Box>
            {!node.isLeaf && (
                <Box sx={styles.meta}>
                    {aggregate.scope}/{aggregate.total}
                    {aggregate.exc > 0 &&
                        ` · ${formatMessage(
                            MESSAGES.scopeBranchExcludedSuffix,
                            {
                                count: String(aggregate.exc),
                            },
                        )}`}
                </Box>
            )}
        </Box>
    );
};
