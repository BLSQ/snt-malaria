import React, { FC } from 'react';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
    Box,
    ClickAwayListener,
    MenuItem,
    MenuList,
    Popover,
    Typography,
} from '@mui/material';
import { IconButton, useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../domains/messages';

const styles = {
    container: {
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'background.paper',
        paddingX: 1,
        borderRadius: 1,
    },
};

type Props = {
    selectedOrgUnits: number[];
    onClearAll: () => void;
    onSelectAll: () => void;
    onInvertSelection: () => void;
    disabled?: boolean;
};

export const OrgUnitActions: FC<Props> = ({
    selectedOrgUnits,
    onClearAll,
    onSelectAll,
    onInvertSelection,
    disabled,
}) => {
    const { formatMessage } = useSafeIntl();
    const anchorRef = React.useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = React.useState<boolean>(false);

    return (
        <Box sx={styles.container}>
            <Typography variant="body2">
                {formatMessage(MESSAGES.selectedOrgUnitsCount, {
                    selectionCount: selectedOrgUnits.length,
                })}
            </Typography>
            <IconButton
                disabled={disabled || selectedOrgUnits.length === 0}
                overrideIcon={HighlightOffIcon}
                onClick={onClearAll}
                tooltipMessage={MESSAGES.interventionAssignmentRemoveAllButton}
                iconSize="small"
            />
            <Box ref={anchorRef}>
                <IconButton
                    overrideIcon={MoreVertIcon}
                    onClick={() => setIsOpen(!isOpen)}
                    tooltipMessage={MESSAGES.more}
                    iconSize="small"
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
                <ClickAwayListener onClickAway={() => setIsOpen(false)}>
                    <MenuList>
                        <MenuItem
                            onClick={() => onSelectAll()}
                            sx={{ fontSize: 'small' }}
                        >
                            {formatMessage(MESSAGES.selectAll)}
                        </MenuItem>
                        <MenuItem
                            onClick={() => onInvertSelection()}
                            sx={{ fontSize: 'small' }}
                        >
                            {formatMessage(MESSAGES.invertSelection)}
                        </MenuItem>
                    </MenuList>
                </ClickAwayListener>
            </Popover>
        </Box>
    );
};
