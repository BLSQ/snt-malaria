import React, { FC, useCallback, useMemo } from 'react';
import { Autocomplete, Stack, TextField, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../../../messages';
import { useGetDonors } from '../hooks/useGetDonors';
import { Donor } from '../types';

type Props = {
    value: number | string | null;
    onChange: (value: number | string | null) => void;
    errors?: string[];
};

export const DonorSelect: FC<Props> = ({ value, onChange, errors }) => {
    const { formatMessage } = useSafeIntl();

    const { data: donors } = useGetDonors();

    const selectedValue = useMemo(() => {
        if (typeof value === 'number') {
            return donors?.find(donor => donor.id === value) ?? null;
        }
        return value ?? null;
    }, [donors, value]);

    // Typed input is kept as a string in the form state unless it matches an
    // existing donor name; unmatched names are created on save.
    const handleInputChange = useCallback(
        (_event: unknown, newInput: string) => {
            const name = newInput.trim();
            if (!name) {
                onChange(null);
                return;
            }
            const match = donors?.find(
                donor => donor.name.toLowerCase() === name.toLowerCase(),
            );
            onChange(match ? match.id : newInput);
        },
        [donors, onChange],
    );

    return (
        <Stack spacing={0.5}>
            <Autocomplete<Donor, false, false, true>
                freeSolo
                options={donors ?? []}
                getOptionLabel={option =>
                    typeof option === 'string' ? option : option.name
                }
                isOptionEqualToValue={(option, selected) =>
                    typeof selected !== 'string' && option.id === selected.id
                }
                value={selectedValue}
                onChange={(_event, newValue) => {
                    if (newValue === null) {
                        onChange(null);
                    } else if (typeof newValue === 'string') {
                        handleInputChange(_event, newValue);
                    } else {
                        onChange(newValue.id);
                    }
                }}
                onInputChange={handleInputChange}
                renderInput={params => (
                    <TextField
                        {...params}
                        label={formatMessage(MESSAGES.grantDonor)}
                        required
                        error={Boolean(errors?.length)}
                        helperText={errors?.[0]}
                    />
                )}
            />
            <Typography variant="caption" color="textSecondary">
                {formatMessage(MESSAGES.grantDonorHelp)}
            </Typography>
        </Stack>
    );
};
