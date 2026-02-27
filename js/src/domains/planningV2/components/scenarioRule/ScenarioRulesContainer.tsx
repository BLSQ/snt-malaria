import React, { FC, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@mui/material';
import { LoadingSpinner, SortableList } from 'bluesquare-components';
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
    rulesContainer: {
        padding: 0,
        backgroundColor: 'paper.default',
    },
    ruleBox: {
        mb: 2,
        p: 2,
        border: 1,
        borderColor: 'grey.300',
        borderRadius: 2,
        overflow: 'auto',
        flexDirection: 'column',
        alignItems: 'flex-start',
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
    const onRulesReorder = useCallback((newRules: ScenarioRule[]) => {
        // This function will be called with the new order of rules after drag-and-drop
        // You can implement the logic to update the order in your backend here
        console.log('New order of rules:', newRules);
    }, []);

    return (
        <Card sx={styles.card}>
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
                    <SortableList
                        items={rules}
                        onChange={onRulesReorder}
                        disabled={true}
                        listItemSx={styles.ruleBox}
                        listSx={styles.rulesContainer}
                        RenderItem={({ item }) => {
                            return (
                                <ScenarioRuleLine
                                    scenarioId={scenarioId}
                                    metricTypeCategories={metricTypeCategories}
                                    interventionCategories={
                                        interventionCategories
                                    }
                                    key={item.id}
                                    rule={item}
                                />
                            );
                        }}
                    />
                )}
            </CardContent>
        </Card>
    );
};
