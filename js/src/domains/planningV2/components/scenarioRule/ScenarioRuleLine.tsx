import React, { FC, useMemo } from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { DeleteModal } from 'Iaso/components/DeleteRestoreModals/DeleteModal';
import { SxStyles } from 'Iaso/types/general';
import { noOp } from 'Iaso/utils';
import { MESSAGES } from '../../../messages';
import { InterventionCategory } from '../../../planning/types/interventions';
import { MetricTypeCategory } from '../../../planning/types/metrics';
import { useDeleteScenarioRule } from '../../hooks/useDeleteScenarioRule';
import { ScenarioRule } from '../../types/scenarioRule';
import { EditScenarioRuleModal } from './ScenarioRuleModal';

const styles: SxStyles = {
    ruleBox: {
        mb: 2,
        p: 2,
        border: 1,
        borderColor: 'grey.300',
        borderRadius: 2,
        overflow: 'auto',
    },
    colorBox: {
        width: 16,
        height: 16,
        mr: 2,
        borderRadius: '5px',
    },
    rulesText: {
        ml: 4,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        textWrap: 'balance',
    },
};

type Props = {
    scenarioId: number;
    rule: ScenarioRule;
    metricTypeCategories: MetricTypeCategory[];
    interventionCategories: InterventionCategory[];
};

export const ScenarioRuleLine: FC<Props> = ({
    scenarioId,
    rule,
    metricTypeCategories,
    interventionCategories,
}) => {
    const { formatMessage } = useSafeIntl();
    const { mutateAsync: deleteScenarioRule } =
        useDeleteScenarioRule(scenarioId);

    const metricTypes = useMemo(
        () => metricTypeCategories.flatMap(category => category.items),
        [metricTypeCategories],
    );
    const metricTypeNames = useMemo(
        () =>
            metricTypes.reduce((acc, mt) => ({ ...acc, [mt.id]: mt.name }), {}),
        [metricTypes],
    );

    const metricTypeCriterionLabel = useMemo(() => {
        return rule.matching_criteria
            ?.map(ip => {
                const metricName =
                    ip.metric_type && metricTypeNames[ip.metric_type]
                        ? metricTypeNames[ip.metric_type]
                        : ip.metric_type;
                return `${metricName} ${ip.operator} ${ip.value ?? ip.string_value}`;
            })
            .join(', ');
    }, [rule.matching_criteria, metricTypeNames]);

    return (
        <Box key={rule.id} sx={styles.ruleBox}>
            <Grid container direction="row" alignItems="center" mb={1}>
                <Box
                    sx={{
                        ...styles.colorBox,
                        bgcolor: rule.color,
                    }}
                />
                <Typography
                    variant="body1"
                    fontWeight="medium"
                    sx={{ flexGrow: 1 }}
                >
                    {rule.name}
                </Typography>
                <EditScenarioRuleModal
                    scenarioId={scenarioId}
                    onClose={noOp}
                    iconProps={{}}
                    metricTypeCategories={metricTypeCategories}
                    interventionCategories={interventionCategories}
                    rule={rule}
                />
                <DeleteModal
                    type="icon"
                    onConfirm={() => deleteScenarioRule(rule.id)}
                    onCancel={noOp}
                    titleMessage={MESSAGES.deleteScenarioRule}
                    iconProps={{}}
                    backdropClick={true}
                >
                    {formatMessage(MESSAGES.deleteScenarioRuleConfirmMessage)}
                </DeleteModal>
            </Grid>
            <Typography
                variant="body2"
                color="textSecondary"
                sx={styles.rulesText}
            >
                {metricTypeCriterionLabel}
            </Typography>
        </Box>
    );
};
