import React, { FC, useState } from 'react';
import { Box, IconButton, Menu, MenuItem } from '@mui/material';
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined';

type Props = {
    handleDisplayOnMap: () => void;
};

export const MoreActionsMenu: FC<Props> = ({ handleDisplayOnMap }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };
    const handleDisplayOnMapAndClose = () => {
        handleClose();
        handleDisplayOnMap();
    };
    const handleDisplayInfoAndClose = () => {
        handleClose();
        console.log('TODO handleDisplayInfoAndClose');
    };

    return (
        <Box sx={{ marginLeft: 1 }}>
            <IconButton
                id="basic-button"
                aria-controls={open ? 'basic-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
                onClick={handleClick}
            >
                <MoreVertOutlinedIcon />
            </IconButton>
            <Menu
                id="basic-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                MenuListProps={{
                    'aria-labelledby': 'basic-button',
                }}
            >
                <MenuItem onClick={handleDisplayOnMapAndClose}>
                    Show on map
                </MenuItem>
                <MenuItem onClick={handleDisplayInfoAndClose}>Info</MenuItem>
            </Menu>
        </Box>
    );
};
