import React, { FC } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { Box, Drawer, IconButton } from '@mui/material';

type Props = {
    toggleDrawer: () => void;
    isDrawerOpen: boolean;
};
export const LayersDrawer: FC<Props> = ({ toggleDrawer, isDrawerOpen }) => {
    return (
        <Drawer anchor="left" open={isDrawerOpen} onClose={toggleDrawer}>
            <Box
                sx={{ width: 350, p: 2, position: 'relative' }}
                role="presentation"
                onClick={toggleDrawer}
                onKeyDown={toggleDrawer}
            >
                <IconButton
                    aria-label="close"
                    onClick={toggleDrawer}
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                >
                    <CloseIcon />
                </IconButton>
            </Box>
        </Drawer>
    );
};
