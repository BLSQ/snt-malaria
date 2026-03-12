import React, { FC, useState } from 'react';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { Box, ClickAwayListener, MenuList, Popover } from '@mui/material';
import { IconButton } from 'bluesquare-components';
import { MESSAGES } from '../domains/messages';

type Props = {
    children: React.ReactNode;
};

export const MoreActions: FC<Props> = ({ children }) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const anchorRef = React.useRef<HTMLDivElement>(null);

    const togglePopover = () => {
        setIsOpen(!isOpen);
    };

    const handleClose = (event: Event) => {
        if (
            anchorRef.current &&
            anchorRef.current.contains(event.target as HTMLElement)
        ) {
            return;
        }

        setIsOpen(false);
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
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
            >
                <ClickAwayListener onClickAway={handleClose}>
                    <MenuList>{children}</MenuList>
                </ClickAwayListener>
            </Popover>
        </>
    );
};
