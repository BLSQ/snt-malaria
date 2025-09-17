import React from 'react';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Box, Divider, IconButton, Typography } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';

const styles: SxStyles = {
    headerIcon: {
        marginRight: 2,
    },
    header: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 2,
    },
};

export const DrawerHeader: React.FC<{
    title?: string;
    onClose: () => void;
}> = ({ title, onClose }) => {
    return (
        <>
            <Box sx={styles.header}>
                <IconButton onClick={onClose} sx={styles.headerIcon}>
                    <ChevronRightIcon color="disabled" />
                </IconButton>
                <Typography>{title}</Typography>
            </Box>
            <Divider />
        </>
    );
};
