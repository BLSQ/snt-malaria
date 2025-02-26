import React, { FC } from 'react';
import { Button, Grid } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../../messages';

type ApplyButtonProps = {
    onClick: () => void;
};
export const ApplyInterventionsMixButton: FC<ApplyButtonProps> = ({
    onClick,
}) => {
    const { formatMessage } = useSafeIntl();
    return (
        <Grid
            item
            display="flex"
            justifyContent="flex-end"
            alignItems="flex-end"
            padding={2}
            sx={{
                height: '68px',
            }}
        >
            <Button
                onClick={onClick}
                variant="contained"
                color="primary"
                sx={{
                    fontSize: '0.875rem',
                    textTransform: 'none',
                }}
            >
                {formatMessage(MESSAGES.applyMixAndAddPlan)}
            </Button>
        </Grid>
    );
};
