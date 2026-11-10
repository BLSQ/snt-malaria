import React, { FC, MouseEvent, ReactNode, useCallback } from 'react';
import { Check, Close, ExpandMore, Remove } from '@mui/icons-material';
import { Box, Tooltip } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { OrgUnitTreeNode, TreeCheckState } from './types';

const styles = {
    row: {
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        height: 36,
        pr: 1.5,
        cursor: 'default',
    },
    expandableRow: {
        cursor: 'pointer',
        '&:hover': { backgroundColor: 'action.hover' },
    },
    caret: {
        width: 22,
        height: 22,
        flex: '0 0 22px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'text.secondary',
        transition: 'transform 150ms',
    },
    closedCaret: {
        transform: 'rotate(-90deg)',
    },
    leafCaret: {
        visibility: 'hidden',
    },
    box: {
        flex: '0 0 18px',
        width: 18,
        height: 18,
        boxSizing: 'border-box',
        borderRadius: '2px',
        border: '2px solid',
        borderColor: 'text.secondary',
        backgroundColor: 'transparent',
        color: 'common.white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
    },
    boxIcon: {
        fontSize: 16,
    },
    label: {
        flex: '1 1 auto',
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        typography: 'body2',
        fontWeight: 'regular',
        color: 'text.primary',
    },
    branchLabel: {
        fontWeight: 'medium',
    },
    struckThroughLabel: {
        color: 'text.secondary',
        textDecoration: 'line-through',
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
} satisfies SxStyles;

type Props = {
    node: OrgUnitTreeNode;
    depth: number;
    isOpen: boolean;
    checkState: TreeCheckState;
    tooltip: string;
    boxColor?: string;
    rowBackgroundColor?: string;
    isLabelStruckThrough?: boolean;
    branchMeta?: ReactNode;
    onToggleOpen: () => void;
    onToggleSelection: () => void;
};

export const OrgUnitTreeRow: FC<Props> = ({
    node,
    depth,
    isOpen,
    checkState,
    tooltip,
    boxColor,
    rowBackgroundColor = 'transparent',
    isLabelStruckThrough = false,
    branchMeta,
    onToggleOpen,
    onToggleSelection,
}) => {
    const hasChildren = node.children.length > 0;

    const handleCheckboxClick = useCallback(
        (event: MouseEvent) => {
            event.stopPropagation();
            onToggleSelection();
        },
        [onToggleSelection],
    );

    return (
        <Box
            sx={[
                styles.row,
                hasChildren && styles.expandableRow,
                {
                    pl: `${8 + depth * 20}px`,
                    backgroundColor: rowBackgroundColor,
                },
            ]}
            onClick={hasChildren ? onToggleOpen : undefined}
        >
            <Box
                sx={[
                    styles.caret,
                    !isOpen && styles.closedCaret,
                    !hasChildren && styles.leafCaret,
                ]}
            >
                <ExpandMore fontSize="small" />
            </Box>
            <Tooltip title={tooltip} placement="left" disableInteractive>
                <Box
                    sx={[
                        styles.box,
                        Boolean(boxColor) && {
                            borderColor: boxColor,
                            backgroundColor: boxColor,
                        },
                    ]}
                    onClick={handleCheckboxClick}
                >
                    {checkState === 'crossed' && <Close sx={styles.boxIcon} />}
                    {checkState === 'checked' && <Check sx={styles.boxIcon} />}
                    {checkState === 'partial' && <Remove sx={styles.boxIcon} />}
                </Box>
            </Tooltip>
            <Box
                sx={[
                    styles.label,
                    !node.isLeaf && styles.branchLabel,
                    isLabelStruckThrough && styles.struckThroughLabel,
                ]}
            >
                {node.name}
            </Box>
            {branchMeta && <Box sx={styles.branchMeta}>{branchMeta}</Box>}
        </Box>
    );
};
