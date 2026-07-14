import React, { FC } from 'react';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CategoryIcon from '@mui/icons-material/Category';
import FunctionsIcon from '@mui/icons-material/Functions';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import LayersIcon from '@mui/icons-material/Layers';
import { Box } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../messages';

// MUI icon shown in each node's header, keyed by node type.
const NODE_ICONS: Record<
    string,
    React.ComponentType<{ sx?: SxStyles[string] }>
> = {
    dataLayer: LayersIcon,
    formula: FunctionsIcon,
    classify: CategoryIcon,
    output: AccountTreeIcon,
};

const styles = {
    root: {
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        width: '100%',
    },
    icon: { fontSize: 16 },
    label: {
        flexGrow: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    deleteButton: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 0,
        border: 'none',
        background: 'transparent',
        color: 'inherit',
        cursor: 'pointer',
        opacity: 0.75,
        '&:hover': { opacity: 1 },
    },
} satisfies SxStyles;

type Props = {
    /** Flume node type descriptor (`type`, `label`, `deletable`, …). */
    nodeType: any;
    /** Flume node header actions; `deleteNode` removes this node from the graph. */
    actions: any;
};

/**
 * Content of a node's title bar: an icon for the node type before the label (Flume renders just
 * the label) and, for deletable nodes, a trailing bin button so they can be removed without the
 * context menu.
 */
export const NodeHeaderContent: FC<Props> = ({ nodeType, actions }) => {
    const { formatMessage } = useSafeIntl();
    const Icon = NODE_ICONS[nodeType?.type];
    const deletable = nodeType?.deletable !== false;
    return (
        <Box sx={styles.root}>
            {Icon && <Icon sx={styles.icon} />}
            <Box component="span" sx={styles.label}>
                {nodeType?.label}
            </Box>
            {deletable && actions?.deleteNode && (
                <Box
                    component="button"
                    type="button"
                    aria-label={formatMessage(MESSAGES.deleteNode)}
                    title={formatMessage(MESSAGES.deleteNode)}
                    // Swallow the mousedown so Flume doesn't start dragging the node.
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => {
                        e.stopPropagation();
                        actions.deleteNode();
                    }}
                    sx={styles.deleteButton}
                >
                    <HighlightOffIcon sx={styles.icon} />
                </Box>
            )}
        </Box>
    );
};
