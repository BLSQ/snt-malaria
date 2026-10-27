import React, { ChangeEvent, FC, useCallback } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { Box, ButtonBase, SxProps, Theme } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../domains/messages';

const SEARCH_ICON_CLASS = 'inlineSearchIcon';
const CLEAR_ICON_CLASS = 'inlineSearchClearIcon';

const styles = {
    root: {
        flex: '1 1 auto',
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
    },
    clearableRoot: {
        [`& .${CLEAR_ICON_CLASS}`]: { display: 'none' },
        [`&:hover .${SEARCH_ICON_CLASS}, & .Mui-focusVisible .${SEARCH_ICON_CLASS}`]:
            { display: 'none' },
        [`&:hover .${CLEAR_ICON_CLASS}, & .Mui-focusVisible .${CLEAR_ICON_CLASS}`]:
            { display: 'block' },
        '&:hover .MuiButtonBase-root, & .Mui-focusVisible': {
            color: 'text.primary',
        },
    },
    icon: {
        display: 'flex',
        color: 'text.secondary',
    },
    clearButton: {
        borderRadius: '50%',
        color: 'text.secondary',
    },
    iconSize: { fontSize: 20 },
    input: {
        flex: 1,
        minWidth: 0,
        p: 0,
        border: 0,
        outline: 'none',
        background: 'transparent',
        font: 'inherit',
        typography: 'body2',
        color: 'text.primary',
    },
} satisfies SxStyles;

type Props = {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    sx?: SxProps<Theme>;
};

export const InlineSearchInput: FC<Props> = ({
    value,
    onChange,
    placeholder,
    sx,
}) => {
    const { formatMessage } = useSafeIntl();
    const hasValue = value !== '';

    const handleChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value),
        [onChange],
    );
    const handleClear = useCallback(() => onChange(''), [onChange]);

    return (
        <Box
            sx={[
                styles.root,
                hasValue && styles.clearableRoot,
                ...(Array.isArray(sx) ? sx : [sx]),
            ]}
        >
            {hasValue ? (
                <ButtonBase
                    onClick={handleClear}
                    title={formatMessage(MESSAGES.clearSearch)}
                    aria-label={formatMessage(MESSAGES.clearSearch)}
                    sx={styles.clearButton}
                >
                    <SearchIcon
                        className={SEARCH_ICON_CLASS}
                        sx={styles.iconSize}
                    />
                    <CloseIcon
                        className={CLEAR_ICON_CLASS}
                        sx={styles.iconSize}
                    />
                </ButtonBase>
            ) : (
                <Box component="span" sx={styles.icon}>
                    <SearchIcon sx={styles.iconSize} />
                </Box>
            )}
            <Box
                component="input"
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                sx={styles.input}
            />
        </Box>
    );
};
