import React, { FC, ReactNode } from 'react';
import Box from '@mui/material/Box/Box';
import Card from '@mui/material/Card/Card';
import Stack from '@mui/material/Stack/Stack';
import { SxStyles } from 'Iaso/types/general';
import { CardStyled } from '../../../components/CardStyled';
import { SidePanelToggle } from '../../../components/sidePanel/SidePanelToggle';

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
    headerContent: { flex: 1, minWidth: 0 },
} satisfies SxStyles;

type Props = {
    header?: ReactNode;
    centered?: boolean;
    children: ReactNode;
};

export const WizardMainCard: FC<Props> = ({ header, centered, children }) => (
    <Card sx={styles.card}>
        <CardStyled
            header={
                header && (
                    <Stack direction="row" alignItems="center">
                        <SidePanelToggle />
                        <Box sx={styles.headerContent}>{header}</Box>
                    </Stack>
                )
            }
        >
            {centered ? (
                <Stack sx={styles.centered}>{children}</Stack>
            ) : (
                children
            )}
        </CardStyled>
    </Card>
);
