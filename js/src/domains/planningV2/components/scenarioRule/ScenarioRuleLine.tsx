import React, { FC, useMemo } from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { DeleteModal } from 'Iaso/components/DeleteRestoreModals/DeleteModal';
import { SxStyles } from 'Iaso/types/general';
import { noOp } from 'Iaso/utils';
import { MESSAGES } from '../../../messages';
import { usePlanningContext } from '../../contexts/PlanningContext';
import { useDeleteScenarioRule } from '../../hooks/useDeleteScenarioRule';
import { ScenarioRule } from '../../types/scenarioRule';
import { EditScenarioRuleModal } from './ScenarioRuleModal';

const styles: SxStyles = {
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
};

export const ScenarioRuleLine: FC<Props> = ({ scenarioId, rule }) => {
    const { formatMessage } = useSafeIntl();
    const { mutateAsync: deleteScenarioRule } =
        useDeleteScenarioRule(scenarioId);

    const { metricTypeCategories, canEditScenario } = usePlanningContext();

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
    }, [rule, metricTypeNames]);

    return (
        <React.Fragment key={rule.id}>
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
                {canEditScenario && (
                    <>
                        <EditScenarioRuleModal
                            scenarioId={scenarioId}
                            onClose={noOp}
                            iconProps={{}}
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
                    </>
                )}
            </Grid>
            <Typography
                variant="body2"
                color="textSecondary"
                sx={styles.rulesText}
            >
                {metricTypeCriterionLabel}
            </Typography>
        </React.Fragment>
    );
};
