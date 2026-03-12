import React, { FC, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@mui/material';
import { AsyncSortableList, LoadingSpinner } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { useReorderScenarioRules } from '../../hooks/useReorderScenarioRules';
import { ScenarioRule } from '../../types/scenarioRule';
import { ScenarioRuleLine } from './ScenarioRuleLine';
import { ScenarioRulesHeader } from './ScenarioRulesHeader';
import { usePlanningContext } from '../../contexts/PlanningContext';

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
        backgroundColor: 'white',
    },
};

type Props = {
    scenarioId: number;
    isLoading: boolean;
    onApplyRules?: () => void;
    rules: ScenarioRule[];
};

export const ScenarioRulesContainer: FC<Props> = ({
    scenarioId,
    isLoading,
    onApplyRules,
    rules,
}) => {
    const { mutate: reorderScenarioRules } =
        useReorderScenarioRules(scenarioId);
    const { canEditScenario } = usePlanningContext();

    const handleReorder = useCallback(
        ({
            resume,
            abort,
            items,
        }: {
            resume: () => void;
            abort: () => void;
            items: ScenarioRule[];
        }) => {
            reorderScenarioRules(
                items.map(r => r.id),
                // abort doesn't work, a topic is open about it: https://github.com/clauderic/dnd-kit/issues/1769
                { onSuccess: resume, onError: abort },
            );
        },
        [reorderScenarioRules],
    );

    return (
        <Card sx={styles.card}>
            <CardHeader
                sx={styles.cardHeader}
                title={
                    <ScenarioRulesHeader
                        scenarioId={scenarioId}
                        onApplyRules={onApplyRules}
                    />
                }
            />

            <CardContent sx={styles.cardContent}>
                {isLoading ? (
                    <LoadingSpinner absolute={true} />
                ) : (
                    <AsyncSortableList
                        items={rules}
                        onDragEnd={handleReorder}
                        listSx={styles.rulesContainer}
                        itemSx={styles.ruleBox}
                        showOverlay={false}
                        disabled={!canEditScenario}
                        RenderItem={({ item }) => (
                            <ScenarioRuleLine
                                scenarioId={scenarioId}
                                rule={item}
                            />
                        )}
                    ></AsyncSortableList>
                )}
            </CardContent>
        </Card>
    );
};
