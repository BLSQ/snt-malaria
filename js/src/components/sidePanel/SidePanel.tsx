import React, { FC, ReactNode } from 'react';
import Box from '@mui/material/Box/Box';
import { SxStyles } from 'Iaso/types/general';
import { useSidePanelLabel } from './useSidePanelLabel';

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
    useSidePanelLabel({ title, hint }, 'base');
    return <Box sx={styles.root}>{children}</Box>;
};
