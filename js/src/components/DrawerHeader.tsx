import React from 'react';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Box from '@mui/material/Box/Box';
import Divider from '@mui/material/Divider/Divider';
import IconButton from '@mui/material/IconButton/IconButton';
import Typography from '@mui/material/Typography/Typography';
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
    hideDivider?: boolean;
    onClose: () => void;
}> = ({ title, hideDivider = false, onClose }) => {
    return (
        <>
            <Box sx={styles.header}>
                <IconButton onClick={onClose} sx={styles.headerIcon}>
                    <ChevronRightIcon color="disabled" />
                </IconButton>
                <Typography>{title}</Typography>
            </Box>
            {!hideDivider && <Divider />}
        </>
    );
};
