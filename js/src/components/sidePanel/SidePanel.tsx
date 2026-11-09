import React, { FC, ReactNode } from 'react';
import Box from '@mui/material/Box/Box';
import { SxStyles } from 'Iaso/types/general';
import { useSidePanelHold } from './useSidePanelHold';
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
    /** Each change holds the undocked panel open until the pointer re-enters it. */
    holdKey?: unknown;
    children: ReactNode;
};

export const SidePanel: FC<Props> = ({ title, hint, holdKey, children }) => {
    useSidePanelLabel({ title, hint }, BASE_LABEL_KEY);
    useSidePanelHold(holdKey);
    return <Box sx={styles.root}>{children}</Box>;
};
