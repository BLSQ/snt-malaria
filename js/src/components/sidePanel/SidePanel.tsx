import React, { FC, ReactNode } from 'react';
import { Box } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { useSidePanelLabel } from './useSidePanelLabel';
import { BASE_LABEL_KEY } from './useSidePanelState';

const styles = {
    root: {
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 auto',
        minHeight: 0,
    },
} satisfies SxStyles;

type Props = {
    title: string;
    hint?: string;
    children: ReactNode;
};

export const SidePanel: FC<Props> = ({ title, hint, children }) => {
    useSidePanelLabel({ title, hint }, BASE_LABEL_KEY);
    return <Box sx={styles.root}>{children}</Box>;
};
