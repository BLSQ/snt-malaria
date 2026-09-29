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
        transition:
            'border-color 120ms, background-color 120ms, box-shadow 120ms',
        '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'action.hover',
            boxShadow: 1,
        },
    },
    disabled: { opacity: 0.5, pointerEvents: 'none' },
} satisfies SxStyles;

type Props = {
    onClick: () => void;
    disabled?: boolean;
    children: ReactNode;
};

export const ActionCard: FC<Props> = ({
    onClick,
    disabled = false,
    children,
}) => (
    <Box
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={onClick}
        onKeyDown={(event: KeyboardEvent) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
            }
        }}
        sx={[styles.card, disabled && styles.disabled]}
    >
        {children}
    </Box>
);
