import React, { FC, MouseEvent, ReactNode, useCallback } from 'react';
import { Check, Close, ExpandMore, Remove } from '@mui/icons-material';
import { Box, Tooltip, useTheme } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { OrgUnitTreeNode, TreeCheckState } from './types';

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
    const theme = useTheme();
    const hasChildren = node.children.length > 0;

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
            color: isLabelStruckThrough ? 'text.secondary' : 'text.primary',
            textDecoration: isLabelStruckThrough ? 'line-through' : 'none',
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
                    {checkState === 'crossed' && <Close sx={styles.boxIcon} />}
                    {checkState === 'checked' && <Check sx={styles.boxIcon} />}
                    {checkState === 'partial' && <Remove sx={styles.boxIcon} />}
                </Box>
            </Tooltip>
            <Box sx={rowStyles.label}>{node.name}</Box>
            {branchMeta && <Box sx={styles.branchMeta}>{branchMeta}</Box>}
        </Box>
    );
};
