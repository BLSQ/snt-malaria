import React, { FC } from 'react';
import { Box, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { SxStyles } from 'Iaso/types/general';

type Option = {
    id: number;
    label: string;
};

type Props = {
    color: string;
    label: string;
    options?: Option[];
    value?: number;
    onChange?: (event: SelectChangeEvent<number>) => void;
};

const styles = {
    chip: {
        p: 1,
        borderRadius: 2,
        backgroundColor: theme => alpha(theme.palette.common.white, 0.75),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 1,
    },
    dot: {
        width: theme => theme.spacing(1.75),
        height: theme => theme.spacing(1.75),
        borderRadius: '50%',
        flex: '0 0 auto',
    },
    text: {
        fontSize: '1rem',
        fontWeight: 500,
        color: 'text.primary',
        whiteSpace: 'nowrap',
        m: 0,
    },
    select: {
        fontSize: '1rem',
        fontWeight: 500,
        color: 'text.primary',
        minHeight: 0,
        '& .MuiSelect-select': {
            paddingTop: '0 !important',
            paddingBottom: '0 !important',
            paddingLeft: '0 !important',
            paddingRight: '20px !important',
            minHeight: '0 !important',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
        },
        '& .MuiInputBase-input': {
            paddingTop: '0 !important',
            paddingBottom: '0 !important',
            paddingLeft: '0 !important',
        },
        '& .MuiOutlinedInput-notchedOutline': {
            border: 'none',
        },
        '& .MuiSelect-icon': {
            right: 0,
            top: 'auto',
            color: 'text.secondary',
            fontSize: '1rem',
        },
    },
} satisfies SxStyles;

export const LabelChip: FC<Props> = ({
    color,
    label,
    options,
    value,
    onChange,
}) => {
    const showDropdown = options && options.length > 1 && onChange;

    return (
        <Box sx={styles.chip}>
            <Box sx={[styles.dot, { backgroundColor: color }]} />
            {showDropdown ? (
                <Select
                    size="small"
                    value={value}
                    onChange={onChange}
                    sx={styles.select}
                    variant="outlined"
                >
                    {options.map(opt => (
                        <MenuItem key={opt.id} value={opt.id}>
                            {opt.label}
                        </MenuItem>
                    ))}
                </Select>
            ) : (
                <Box sx={styles.text}>{label}</Box>
            )}
        </Box>
    );
};
