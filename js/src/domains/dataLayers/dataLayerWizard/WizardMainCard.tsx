import React, { FC, ReactNode } from 'react';
import { Card, Stack } from '@mui/material';
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
    centered?: boolean;
    children: ReactNode;
};

export const WizardMainCard: FC<Props> = ({ header, centered, children }) => (
    <Card sx={styles.card}>
        <CardStyled header={header}>
            {centered ? (
                <Stack sx={styles.centered}>{children}</Stack>
            ) : (
                children
            )}
        </CardStyled>
    </Card>
);
