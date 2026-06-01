import React, { FC } from 'react';
import { InputAdornment, TextField } from '@mui/material';

type Props = {
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    disabled?: boolean;
};

export const YearlyCoverageInput: FC<Props> = ({
    value,
    onChange,
    onBlur,
    disabled = false,
}) => {
    return (
        <TextField
            value={value}
            onChange={event => {
                onChange(event.target.value);
            }}
            onBlur={onBlur}
            disabled={disabled}
            type="number"
            size="small"
            inputProps={{
                min: 0,
                max: 100,
                step: 1,
                inputMode: 'decimal',
                style: { paddingRight: '0' },
            }}
            InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
            }}
            sx={{ width: 95 }}
        />
    );
};
