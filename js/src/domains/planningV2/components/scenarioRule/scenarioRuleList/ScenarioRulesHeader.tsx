import React, { FC } from 'react';
import SettingsInputComponentOutlinedIcon from '@mui/icons-material/SettingsInputComponentOutlined';
import { Button, Stack, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { IconBoxed } from '../../../../../components/IconBoxed';
import { MESSAGES } from '../../../../messages';
import { usePlanningContext } from '../../../contexts/PlanningContext';

type Props = {
    onCreateRule: () => void;
};

export const ScenarioRulesHeader: FC<Props> = ({ onCreateRule }) => {
    const { formatMessage } = useSafeIntl();
    const { canEditScenario } = usePlanningContext();

    return (
        <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
        >
            <Stack spacing={1} direction="row" alignItems="center">
                <IconBoxed Icon={SettingsInputComponentOutlinedIcon} />

                <Typography variant="h6" gutterBottom color="#1F2B3D">
                    {formatMessage(MESSAGES.interventionTitle)}
                </Typography>
            </Stack>
            {canEditScenario && (
                <Button onClick={() => onCreateRule()}>
                    {formatMessage(MESSAGES.createScenarioRule)}
                </Button>
            )}
        </Stack>
    );
};
