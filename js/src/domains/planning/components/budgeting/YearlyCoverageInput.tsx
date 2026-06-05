import React, { FC } from 'react';
import { InputAdornment, TextField } from '@mui/material';

type Props = {
    value?: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    disabled?: boolean;
    percentage?: boolean;
};

export const YearlyCoverageInput: FC<Props> = ({
    value,
    onChange,
    onBlur,
    disabled = false,
    percentage = false,
}) => (
    <TextField
        value={value ?? (percentage ? '100' : '0')}
        onChange={event => onChange(event.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        type="number"
        size="small"
        inputProps={{
            min: 0,
            ...(percentage ? { max: 100 } : {}),
            step: 1,
            inputMode: 'numeric',
            style: { paddingRight: percentage ? '0' : '1rem' },
        }}
        InputProps={
            percentage
                ? {
                      endAdornment: (
                          <InputAdornment position="end">%</InputAdornment>
                      ),
                  }
                : undefined
        }
        sx={{ width: 95 }}
    />
);
