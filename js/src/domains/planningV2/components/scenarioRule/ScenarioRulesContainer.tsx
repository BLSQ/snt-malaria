import React, { FC } from 'react';
import { Card, CardContent, CardHeader } from '@mui/material';
import { LoadingSpinner } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { InterventionCategory } from '../../../planning/types/interventions';
import { MetricTypeCategory } from '../../../planning/types/metrics';
import { ScenarioRule } from '../../types/scenarioRule';
import { ScenarioRuleLine } from './ScenarioRuleLine';
import { ScenarioRulesHeader } from './ScenarioRulesHeader';

const styles: SxStyles = {
    card: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },
    cardHeader: {
        borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
        pb: 1,
    },
    cardContent: {
        overflow: 'auto',
        position: 'relative',
        flexGrow: 1,
        '&:last-child': {
            paddingBottom: 0,
        },
    },
};

type Props = {
    scenarioId: number;
    isLoading: boolean;
    onApplyRules?: () => void;
    rules: ScenarioRule[];
    metricTypeCategories: MetricTypeCategory[];
    interventionCategories: InterventionCategory[];
};

export const ScenarioRulesContainer: FC<Props> = ({
    scenarioId,
    isLoading,
    onApplyRules,
    rules,
    metricTypeCategories,
    interventionCategories,
}) => {
    const metricTypes = metricTypeCategories.flatMap(
        category => category.items,
    );
    return (
        <Card elevation={2} sx={styles.card}>
            <CardHeader
                sx={styles.cardHeader}
                title={
                    <ScenarioRulesHeader
                        scenarioId={scenarioId}
                        onApplyRules={onApplyRules}
                        metricTypeCategories={metricTypeCategories}
                        interventionCategories={interventionCategories}
                    />
                }
            />

            <CardContent sx={styles.cardContent}>
                {isLoading ? (
                    <LoadingSpinner absolute={true} />
                ) : (
                    rules.map(rule => (
                        <ScenarioRuleLine
                            metricTypes={metricTypes}
                            key={rule.id}
                            rule={rule}
                        />
                    ))
                )}
            </CardContent>
        </Card>
    );
};
