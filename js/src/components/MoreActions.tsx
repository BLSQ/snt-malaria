import React, { FC, useState } from 'react';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { Box, MenuList, Popover } from '@mui/material';
import { IconButton } from 'bluesquare-components';
import { MESSAGES } from '../domains/messages';

type Props = {
    children: React.ReactNode;
};

export const MoreActions: FC<Props> = ({ children }) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const anchorRef = React.useRef<HTMLDivElement>(null);

    const togglePopover = () => {
        setIsOpen(prev => !prev);
    };

    return (
        <>
            <Box ref={anchorRef}>
                <IconButton
                    overrideIcon={MoreHorizIcon}
                    onClick={togglePopover}
                    tooltipMessage={MESSAGES.more}
                ></IconButton>
            </Box>
            <Popover
                id="import_scenario"
                open={isOpen}
                anchorEl={anchorRef.current}
                onClose={() => setIsOpen(false)}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
            >
                <MenuList>{children}</MenuList>
            </Popover>
        </>
    );
};
