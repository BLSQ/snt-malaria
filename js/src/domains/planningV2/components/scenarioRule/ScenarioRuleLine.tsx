import React, { FC, useMemo } from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { noOp } from 'Iaso/utils';
import { MetricType } from '../../../planning/types/metrics';
import { ScenarioRule } from '../../types/scenarioRule';

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
    rule: ScenarioRule;
    metricTypes: MetricType[];
    onClick?: () => void;
};

export const ScenarioRuleLine: FC<Props> = ({
    rule,
    metricTypes,
    onClick = noOp,
}) => {
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
        <Box key={rule.id} sx={styles.ruleBox} onClick={onClick}>
            <Grid container direction="row" alignItems="center" mb={1}>
                <Box
                    sx={{
                        ...styles.colorBox,
                        bgcolor: rule.color,
                    }}
                />
                <Typography variant="body1" fontWeight="medium">
                    {rule.name}
                </Typography>
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
