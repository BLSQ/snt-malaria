import React, { FC, ReactNode } from 'react';
import { Box, Stack } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { CardStyled } from '../../../components/CardStyled';

const styles = {
    card: { height: '100%', display: 'flex', flexDirection: 'column' },
    centered: {
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 1.5,
        p: 4,
    },
} satisfies SxStyles;

type Props = {
    header?: ReactNode;
    /** Wrap children in a full-height centred stack (empty states / previews). */
    centered?: boolean;
    children: ReactNode;
};

/** Full-height card the wizard's main column fills — used by the map preview,
 *  the value grid and the placeholder / status panels so they share one frame. */
export const WizardMainCard: FC<Props> = ({ header, centered, children }) => (
    <Box sx={styles.card}>
        <CardStyled header={header}>
            {centered ? (
                <Stack sx={styles.centered}>{children}</Stack>
            ) : (
                children
            )}
        </CardStyled>
    </Box>
);
