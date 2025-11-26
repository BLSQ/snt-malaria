import React, { FC, ReactNode } from 'react';
import { Box } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';

type Props = {
    children: ReactNode;
};

const styles: SxStyles = {
    actionBox: {
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 1000,
        borderRadius: 2,
        border: 'none',
        display: 'flex',
        alignItems: 'center',
    },
};

export const MapActionBox: FC<Props> = ({ children }) => {
    return <Box sx={styles.actionBox}>{children}</Box>;
};
