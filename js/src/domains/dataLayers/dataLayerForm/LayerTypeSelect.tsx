import React, { FC, ReactNode } from 'react';
import {
    FormControl,
    InputLabel,
    ListItemIcon,
    ListItemText,
    MenuItem,
    Select,
} from '@mui/material';

export type LayerTypeOption = {
    value: string;
    label: string;
    icon: ReactNode;
};

type Props = {
    label: string;
    value: string;
    options: LayerTypeOption[];
    onChange: (value: string) => void;
    disabled?: boolean;
};

/**
 * Outlined select whose options carry a leading icon — the shared InputComponent select can't.
 * The padding override keeps it the same height (40px) as the InputComponent fields around it.
 */
export const LayerTypeSelect: FC<Props> = ({
    label,
    value,
    options,
    onChange,
    disabled = false,
}) => (
    <FormControl
        fullWidth
        size="small"
        disabled={disabled}
        sx={{
            '& .MuiSelect-select': {
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                paddingTop: '8.5px !important',
                paddingBottom: '8.5px !important',
            },
        }}
    >
        <InputLabel id="layer-type-label">{label}</InputLabel>
        <Select
            labelId="layer-type-label"
            label={label}
            value={value}
            onChange={event => onChange(event.target.value as string)}
            renderValue={selected => {
                const option = options.find(o => o.value === selected);
                return (
                    <>
                        {option?.icon}
                        {option?.label}
                    </>
                );
            }}
        >
            {options.map(option => (
                <MenuItem key={option.value} value={option.value}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                        {option.icon}
                    </ListItemIcon>
                    <ListItemText>{option.label}</ListItemText>
                </MenuItem>
            ))}
        </Select>
    </FormControl>
);
