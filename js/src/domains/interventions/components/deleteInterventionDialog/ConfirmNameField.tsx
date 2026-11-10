import React, { ChangeEvent, FC, useCallback } from 'react';
import { Box, Stack, TextField, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';

const INPUT_ID = 'delete-intervention-confirm-name';

const styles = {
    label: {
        fontWeight: 'medium',
    },
    field: {
        position: 'relative',
    },
    ghostText: {
        position: 'absolute',
        inset: 0,
        px: 1.75,
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        whiteSpace: 'pre',
        pointerEvents: 'none',
        typography: 'body1',
        color: 'text.disabled',
    },
    typedPart: {
        visibility: 'hidden',
    },
} satisfies SxStyles;

type Props = {
    name: string;
    value: string;
    onChange: (value: string) => void;
};

export const ConfirmNameField: FC<Props> = ({ name, value, onChange }) => {
    const { formatMessage } = useSafeIntl();
    const isTypingName = name.startsWith(value);

    const handleChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value),
        [onChange],
    );

    return (
        <Stack spacing={1}>
            <Typography
                component="label"
                htmlFor={INPUT_ID}
                variant="body2"
                sx={styles.label}
            >
                {formatMessage(MESSAGES.deleteInterventionConfirmNameLabel)}
            </Typography>
            <Box sx={styles.field}>
                <TextField
                    id={INPUT_ID}
                    size="small"
                    fullWidth
                    autoComplete="off"
                    value={value}
                    onChange={handleChange}
                />
                {isTypingName && (
                    <Box aria-hidden sx={styles.ghostText}>
                        <Box component="span" sx={styles.typedPart}>
                            {value}
                        </Box>
                        {name.slice(value.length)}
                    </Box>
                )}
            </Box>
            <Typography variant="caption" color="error">
                {formatMessage(MESSAGES.deleteInterventionConfirmNameWarning, {
                    name,
                })}
            </Typography>
        </Stack>
    );
};
