import React, { FC, Ref } from 'react';
import SettingsInputComponentOutlinedIcon from '@mui/icons-material/SettingsInputComponentOutlined';
import { Button, Stack, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { IconBoxed } from '../../../../../components/IconBoxed';
import { MESSAGES } from '../../../../messages';
import { usePlanningContext } from '../../../contexts/PlanningContext';

type Props = {
    onCreateRule: () => void;
    /** Forwarded to the "Create rule" button so callers can anchor overlays
     *  (e.g. an onboarding spotlight) to it. */
    createRuleRef?: Ref<HTMLButtonElement>;
};

export const ScenarioRulesHeader: FC<Props> = ({
    onCreateRule,
    createRuleRef,
}) => {
    const { formatMessage } = useSafeIntl();
    const { isScenarioEditable } = usePlanningContext();

    return (
        <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
        >
            <Stack spacing={1} direction="row" alignItems="center">
                <IconBoxed Icon={SettingsInputComponentOutlinedIcon} />

                <Typography variant="h6" gutterBottom>
                    {formatMessage(MESSAGES.interventionTitle)}
                </Typography>
            </Stack>
            {isScenarioEditable && (
                <Button ref={createRuleRef} onClick={() => onCreateRule()}>
                    {formatMessage(MESSAGES.createScenarioRule)}
                </Button>
            )}
        </Stack>
    );
};
