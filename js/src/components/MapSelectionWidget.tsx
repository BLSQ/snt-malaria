import React, { FC } from 'react';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
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
import { FilterQueryBuilder } from '../domains/planning/components/maps/FilterQueryBuilder';

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
    onApplyFilters?: (filters: any) => void;
    showFilterButton?: boolean;
    disabled?: boolean;
};

export const MapSelectionWidget: FC<Props> = ({
    selectedOrgUnits,
    onClearAll,
    onSelectAll,
    onInvertSelection,
    onApplyFilters,
    showFilterButton = true,
    disabled,
}) => {
    const { formatMessage } = useSafeIntl();
    const anchorRef = React.useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = React.useState<boolean>(false);
    const [queryBuilderIsOpen, setQueryBuilderIsOpen] =
        React.useState<boolean>(false);

    const onSubmitFilters = (filters: any) => {
        if (!onApplyFilters) return;
        onApplyFilters(filters);
        setQueryBuilderIsOpen(false);
    };

    return (
        <Box sx={styles.container}>
            {showFilterButton && (
                <>
                    <IconButton
                        overrideIcon={TuneOutlinedIcon}
                        onClick={() => setQueryBuilderIsOpen(true)}
                        iconSize="small"
                        tooltipMessage={MESSAGES.filter}
                    />
                    <FilterQueryBuilder
                        isOpen={queryBuilderIsOpen}
                        onClose={() => setQueryBuilderIsOpen(false)}
                        onSubmit={onSubmitFilters}
                    />
                </>
            )}
            <Typography variant="body2" sx={{ mr: 1 }}>
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
                    overrideIcon={MoreHorizIcon}
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
