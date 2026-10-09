import React, { FC, useCallback, useMemo, useRef, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import { Box, Button, MenuItem, Popover, alpha } from '@mui/material';
import { IntlMessage, useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import {
    OPTION_MENU_MIN_WIDTH,
    optionMenuStyles,
} from '../../../../../components/optionMenuStyles';

const styles = {
    emptyListButton: {
        width: '100%',
        minHeight: 44,
        border: '1px dashed',
        borderColor: theme => alpha(theme.palette.text.primary, 0.23),
        borderRadius: 2,
        fontWeight: 'medium',
        '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'action.hover',
        },
    },
    filledListButton: {
        px: 0.75,
        py: 0.25,
        fontWeight: 'medium',
    },
} satisfies SxStyles;

export type AddItemOption = {
    value: number;
    label: string;
    groupKey: string;
    groupLabel: string;
};

type OptionGroup = {
    key: string;
    label: string;
    options: AddItemOption[];
};

type Props = {
    label: IntlMessage;
    options: AddItemOption[];
    onClick: (value: number) => void;
    hasItems: boolean;
};

export const AddItemButton: FC<Props> = ({
    label,
    options,
    onClick,
    hasItems,
}) => {
    const { formatMessage } = useSafeIntl();
    const anchorRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);

    const groups = useMemo(() => {
        const byKey = new Map<string, OptionGroup>();
        options.forEach(option => {
            const group = byKey.get(option.groupKey);
            if (group) {
                group.options.push(option);
            } else {
                byKey.set(option.groupKey, {
                    key: option.groupKey,
                    label: option.groupLabel,
                    options: [option],
                });
            }
        });
        return [...byKey.values()];
    }, [options]);

    const handleOpen = useCallback(() => setIsOpen(true), []);
    const handleClose = useCallback(() => setIsOpen(false), []);
    const handlePick = useCallback(
        (value: number) => {
            setIsOpen(false);
            onClick(value);
        },
        [onClick],
    );

    const menuWidth = Math.max(
        anchorRef.current?.offsetWidth ?? 0,
        OPTION_MENU_MIN_WIDTH,
    );

    return (
        <Box ref={anchorRef}>
            <Button
                onClick={handleOpen}
                disabled={options.length === 0}
                size="small"
                startIcon={<AddIcon />}
                sx={hasItems ? styles.filledListButton : styles.emptyListButton}
            >
                {formatMessage(label)}
            </Button>
            <Popover
                open={isOpen}
                onClose={handleClose}
                anchorEl={anchorRef.current}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                slotProps={{
                    paper: {
                        sx: [optionMenuStyles.paper, { width: menuWidth }],
                    },
                }}
            >
                <Box sx={optionMenuStyles.list}>
                    {groups.map(group => (
                        <Box key={group.key}>
                            <Box sx={optionMenuStyles.groupLabel}>
                                {group.label}
                            </Box>
                            {group.options.map(option => (
                                <MenuItem
                                    key={option.value}
                                    title={option.label}
                                    onClick={() => handlePick(option.value)}
                                    sx={optionMenuStyles.option}
                                >
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Box>
                    ))}
                </Box>
            </Popover>
        </Box>
    );
};
