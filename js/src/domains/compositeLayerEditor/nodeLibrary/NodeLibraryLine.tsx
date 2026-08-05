import React, { FC, useCallback } from 'react';
import { Box, ListItem, Typography, useTheme } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { COMPOSITE_NODE_TYPE_DND_MIME } from '../dragAndDrop';
import { NodeLibraryItem } from './nodeLibraryGroups';

const styles = {
    root: {
        borderRadius: 2,
        py: 0,
        border: '1px solid transparent',
        cursor: 'grab',
        '&:active': { cursor: 'grabbing' },
        '&:hover': { bgcolor: 'action.hover' },
    },
    icon: { minWidth: 20, mr: 2 },
    details: {
        flexGrow: 1,
        display: 'flex',
        alignItems: 'center',
        py: 2,
    },
} satisfies SxStyles;

type Props = {
    item: NodeLibraryItem;
};

/** Draggable row for one node-library entry. */
export const NodeLibraryLine: FC<Props> = ({ item }) => {
    const theme = useTheme();
    const onDragStart = useCallback(
        (e: React.DragEvent<HTMLElement>) => {
            e.dataTransfer.setData(COMPOSITE_NODE_TYPE_DND_MIME, item.type);
            e.dataTransfer.effectAllowed = 'copy';
            // Clone the row so the drag image keeps its rounded corners (as DataLayerLine).
            const row = e.currentTarget;
            const rect = row.getBoundingClientRect();
            const clone = row.cloneNode(true) as HTMLElement;
            Object.assign(clone.style, {
                position: 'fixed',
                top: '-1000px',
                left: '-1000px',
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                margin: '0',
                boxSizing: 'border-box',
                borderRadius: `${theme.shape.borderRadius * 2}px`,
                overflow: 'hidden',
                background: theme.palette.background.paper,
            } as Partial<CSSStyleDeclaration>);
            document.body.appendChild(clone);
            e.dataTransfer.setDragImage(
                clone,
                e.clientX - rect.left,
                e.clientY - rect.top,
            );
            requestAnimationFrame(() => clone.remove());
        },
        [item.type, theme],
    );

    const Icon = item.icon;
    return (
        <ListItem draggable onDragStart={onDragStart} sx={styles.root}>
            <Box sx={styles.details}>
                {/* Primary-coloured, unlike the muted data layer rows below. */}
                <Icon sx={styles.icon} color="primary" />
                <Typography variant="body2">{item.label}</Typography>
            </Box>
        </ListItem>
    );
};
