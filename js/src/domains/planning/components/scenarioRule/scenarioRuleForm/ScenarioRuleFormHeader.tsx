import React, { FC } from 'react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import Button from '@mui/material/Button/Button';
import Stack from '@mui/material/Stack/Stack';
import Typography from '@mui/material/Typography/Typography';
import { IconButton, useSafeIntl } from 'bluesquare-components';
import { SidePanelDockButton } from '../../../../../components/sidePanel/SidePanelDockButton';
import { MESSAGES } from '../../../../messages';

type Props = {
    title: string;
    submitLabel?: string;
    disabled?: boolean;
    onCancel: () => void;
    onSubmit: () => void;
};

export const ScenarioRuleFormHeader: FC<Props> = ({
    title,
    submitLabel,
    disabled = false,
    onSubmit,
    onCancel,
}) => {
    const { formatMessage } = useSafeIntl();
    return (
        <Stack
            spacing={1}
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
                {submitLabel ?? formatMessage(MESSAGES.submit)}
            </Button>
            <SidePanelDockButton />
        </Stack>
    );
};
