import React, { FC, KeyboardEvent, ReactNode } from 'react';
import { Box } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';

const styles = {
    card: {
        p: 1.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        cursor: 'pointer',
        transition: 'border-color 120ms, background-color 120ms',
        '&:hover': { borderColor: 'primary.light' },
    },
    selected: {
        borderColor: 'primary.main',
        backgroundColor: 'action.hover',
    },
    disabled: { opacity: 0.5, pointerEvents: 'none' },
} satisfies SxStyles;

type Props = {
    selected: boolean;
    onSelect: () => void;
    disabled?: boolean;
    children: ReactNode;
};

/** Keyboard-accessible radio-style card, shared by the wizard's layer-type and
 *  value-method pickers. Callers own the inner layout. */
export const SelectableCard: FC<Props> = ({
    selected,
    onSelect,
    disabled = false,
    children,
}) => (
    <Box
        role="radio"
        aria-checked={selected}
        tabIndex={disabled ? -1 : 0}
        onClick={onSelect}
        onKeyDown={(event: KeyboardEvent) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect();
            }
        }}
        sx={[
            styles.card,
            selected && styles.selected,
            disabled && styles.disabled,
        ]}
    >
        {children}
    </Box>
);
