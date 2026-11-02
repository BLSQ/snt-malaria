import React, { FC, ReactNode } from 'react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { IconButton, useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../../messages';

const styles = {
    notice: {
        mt: 1,
    },
} satisfies SxStyles;

type Props = {
    title: string;
    submitLabel?: string;
    notice?: ReactNode;
    disabled?: boolean;
    onCancel: () => void;
    onSubmit: () => void;
};

export const ScenarioRuleFormHeader: FC<Props> = ({
    title,
    submitLabel,
    notice,
    disabled = false,
    onSubmit,
    onCancel,
}) => {
    const { formatMessage } = useSafeIntl();
    return (
        <>
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
                <Button
                    onClick={onSubmit}
                    variant="contained"
                    disabled={disabled}
                >
                    {submitLabel ?? formatMessage(MESSAGES.submit)}
                </Button>
            </Stack>
            {notice && (
                <Alert severity="info" sx={styles.notice}>
                    {notice}
                </Alert>
            )}
        </>
    );
};
