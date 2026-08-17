import React, { FC } from 'react';
import { Box } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../messages';
import { StackPriorityRow } from './StackPriorityRow';

const styles = {
    root: {
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        width: '100%',
    },
    hint: {
        m: 0,
        mb: 0.5,
        color: 'text.secondary',
        fontSize: 11,
        lineHeight: 1.3,
    },
} satisfies SxStyles;

type Props = {
    /** Connected ports, lowest to highest priority (see `utils/stackOrder.ts`). */
    order: string[];
    /** Called with the full reordered array on every move. */
    onChange: (order: string[]) => void;
};

/**
 * Lets the user reorder a `stack` combine node's connected inputs by priority: rows read top
 * (lowest priority, applied first) to bottom (highest priority, wins on overlap).
 *
 * Up/down buttons, not drag-and-drop: `bluesquare-components`' `AsyncSortableList` (used for the
 * scenario-rule priority list) is `@dnd-kit`-based, and dnd-kit's viewport-space pointer math
 * breaks under the canvas's `transform: scale(...)` - the same reason `MappingsControl` avoids MUI
 * portals entirely.
 */
export const StackPriorityControl: FC<Props> = ({ order, onChange }) => {
    const { formatMessage } = useSafeIntl();

    const move = (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= order.length) return;
        const next = [...order];
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
    };

    return (
        <Box
            sx={styles.root}
            // Stop Flume from turning clicks into a node drag (mirrors its built-in inputs).
            onMouseDown={e => e.stopPropagation()}
        >
            <Box component="p" sx={styles.hint}>
                {formatMessage(MESSAGES.stackPriorityHint)}
            </Box>
            {order.map((port, index) => (
                <StackPriorityRow
                    key={port}
                    port={port}
                    rank={index + 1}
                    isFirst={index === 0}
                    isLast={index === order.length - 1}
                    onMoveUp={() => move(index, -1)}
                    onMoveDown={() => move(index, 1)}
                />
            ))}
        </Box>
    );
};
