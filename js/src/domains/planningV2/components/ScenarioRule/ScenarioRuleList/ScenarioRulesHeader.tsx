import React, { FC } from 'react';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SettingsInputComponentOutlinedIcon from '@mui/icons-material/SettingsInputComponentOutlined';
import { Button, Stack, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import ConfirmDialog from 'Iaso/components/dialogs/ConfirmDialogComponent';
import { noOp } from 'Iaso/utils';
import { IconBoxed } from '../../../../../components/IconBoxed';
import { MESSAGES } from '../../../../messages';
import { usePlanningContext } from '../../contexts/PlanningContext';

type Props = {
    onApplyRules?: () => void;
    onCreateRule: () => void;
};

export const ScenarioRulesHeader: FC<Props> = ({
    onApplyRules = noOp,
    onCreateRule,
}) => {
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
            <Stack direction="row" sx={{ justifySelf: 'flex-end' }}>
                {canEditScenario && (
                    <>
                        <Button onClick={() => onCreateRule()}>
                            {formatMessage(MESSAGES.createScenarioRule)}
                        </Button>

                        <ConfirmDialog
                            confirm={onApplyRules}
                            question={formatMessage(MESSAGES.applyScenarioRule)}
                            message={formatMessage(
                                MESSAGES.applyScenarioRuleConfirmation,
                            )}
                            BtnIcon={ChevronRightIcon}
                            btnMessage={''}
                         tooltipMessage={formatMessage(MESSAGES.applyScenarioRule)}
                        />
                    </>
                )}
            </Stack>
        </Stack>
    );
};
