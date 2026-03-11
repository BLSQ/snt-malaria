import React, { FC } from 'react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { Button, Stack, Typography } from '@mui/material';
import { IconButton, useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../../../../messages';

type Props = {
    title: string;
    disabled?: boolean;
    onCancel: () => void;
    onSubmit: () => void;
};

export const ScenarioRuleFormHeader: FC<Props> = ({
    title,
    disabled = false,
    onSubmit,
    onCancel,
}) => {
    const { formatMessage } = useSafeIntl();
    return (
        <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
        >
            <IconButton
                onClick={onCancel}
                overrideIcon={ChevronLeftIcon}
                tooltipMessage={MESSAGES.cancel}
            />
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
                {title}
            </Typography>
            <Button onClick={onSubmit} variant="contained" disabled={disabled}>
                {formatMessage(MESSAGES.submit)}
            </Button>
        </Stack>
    );
};
