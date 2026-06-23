import React, { ReactNode } from 'react';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Box, MenuItem, Select, Tooltip, Typography } from '@mui/material';
import { blueGrey } from '@mui/material/colors';
import { LoadingSpinner } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';

export type WidgetCardDropdown<T extends string | number> = {
    value: T;
    options: { value: T; label: string }[];
    onChange: (value: T) => void;
    placeholder?: string;
    disabled?: boolean;
};

type Props<T extends string | number = string | number> = {
    title: string;
    tooltip?: string;
    icon?: React.ElementType;
    iconSx?: Record<string, unknown>;
    actions?: ReactNode;
    // Optional built-in header select (pill style); use instead of `actions`.
    dropdown?: WidgetCardDropdown<T>;
    cardSx?: Record<string, unknown>;
    headerSx?: Record<string, unknown>;
    bodySx?: Record<string, unknown>;
    isLoading?: boolean;
    children?: ReactNode;
};

const styles = {
    card: {
        backgroundColor: 'common.white',
        borderRadius: 4,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        p: 2,
        gap: 2,
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
    },
    titleWrapper: {
        display: 'flex',
        alignItems: 'center',
        gap: 1,
    },
    iconBox: {
        backgroundColor: blueGrey[50],
        p: 0.5,
        borderRadius: 2,
        lineHeight: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: '1rem',
        fontWeight: 500,
        color: 'text.primary',
    },
    body: {
        position: 'relative',
        flex: 1,
        minHeight: 0,
    },
    loadingOverlay: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'common.white',
        opacity: 0.7,
        zIndex: 1100,
    },
} satisfies SxStyles;

export const WidgetCard = <T extends string | number = string | number>({
    title,
    tooltip,
    icon,
    iconSx,
    actions,
    dropdown,
    children,
    cardSx,
    headerSx,
    bodySx,
    isLoading,
}: Props<T>) => {
    // Size the dropdown to its longest option (in `ch`, plus room for the arrow
    // and padding) so it doesn't resize when the selection changes.
    const dropdownMinWidth = dropdown
        ? `calc(${dropdown.options.reduce(
              (max, option) => Math.max(max, option.label.length),
              dropdown.placeholder?.length ?? 0,
          )}ch + 2.5rem)`
        : undefined;

    return (
        <Box sx={{ ...styles.card, ...cardSx }}>
            <Box sx={{ ...styles.header, ...headerSx }}>
                <Box sx={styles.titleWrapper}>
                    {icon && (
                        <Box sx={styles.iconBox}>
                            {React.createElement(icon, {
                                sx: { color: blueGrey[400], ...iconSx },
                            })}
                        </Box>
                    )}
                    <Typography sx={styles.title}>{title}</Typography>
                    {tooltip && (
                        <Tooltip title={tooltip} arrow>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <HelpOutlineIcon
                                    sx={{
                                        color: blueGrey[300],
                                        fontSize: '1rem',
                                        cursor: 'help',
                                    }}
                                />
                            </Box>
                        </Tooltip>
                    )}
                </Box>
                {dropdown ? (
                    <Select
                        size="small"
                        value={dropdown.value ?? ''}
                        onChange={event =>
                            dropdown.onChange(event.target.value as T)
                        }
                        displayEmpty
                        disabled={dropdown.disabled}
                        sx={{
                            minWidth: dropdownMinWidth,
                            ...(dropdown.value === '' ||
                            dropdown.value === undefined ||
                            dropdown.value === null
                                ? { color: 'text.secondary' }
                                : {}),
                        }}
                    >
                        {dropdown.placeholder !== undefined && (
                            <MenuItem value="" sx={{ color: 'text.secondary' }}>
                                {dropdown.placeholder}
                            </MenuItem>
                        )}
                        {dropdown.options.map(option => (
                            <MenuItem
                                key={String(option.value)}
                                value={option.value}
                            >
                                {option.label}
                            </MenuItem>
                        ))}
                    </Select>
                ) : (
                    actions
                )}
            </Box>
            <Box sx={{ ...styles.body, ...bodySx }}>
                {children}
                {isLoading && (
                    <Box sx={styles.loadingOverlay}>
                        <LoadingSpinner
                            size={32}
                            absolute
                            fixed={false}
                            transparent
                        />
                    </Box>
                )}
            </Box>
        </Box>
    );
};
