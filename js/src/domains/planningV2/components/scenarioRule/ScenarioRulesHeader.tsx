import React, { FC } from 'react';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SettingsInputComponentOutlinedIcon from '@mui/icons-material/SettingsInputComponentOutlined';
import { Stack, Typography, Box, Button, Tooltip } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { noOp } from 'Iaso/utils';
import { IconBoxed } from '../../../../components/IconBoxed';
import { MESSAGES } from '../../../messages';
import { InterventionCategory } from '../../../planning/types/interventions';
import { MetricTypeCategory } from '../../../planning/types/metrics';
import { ScenarioRuleModal } from './ScenarioRuleModal';

type Props = {
    scenarioId: number;
    metricTypeCategories: MetricTypeCategory[];
    interventionCategories: InterventionCategory[];
    onApplyRules?: () => void;
};

export const ScenarioRulesHeader: FC<Props> = ({
    scenarioId,
    onApplyRules = noOp,
    metricTypeCategories,
    interventionCategories,
}) => {
    const { formatMessage } = useSafeIntl();

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
            <Box sx={{ justifySelf: 'flex-end' }}>
                <ScenarioRuleModal
                    scenarioId={scenarioId}
                    onClose={noOp}
                    iconProps={{}}
                    metricTypeCategories={metricTypeCategories}
                    interventionCategories={interventionCategories}
                />

                <Tooltip title={formatMessage(MESSAGES.applyScenarioRule)}>
                    <Button onClick={onApplyRules}>
                        <ChevronRightIcon />
                    </Button>
                </Tooltip>
            </Box>
        </Stack>
    );
};
