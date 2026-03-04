import React, { FC, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/helpers';
import { DragDropProvider } from '@dnd-kit/react';
import { isSortable } from '@dnd-kit/react/sortable';
import { Card, CardContent, CardHeader, List } from '@mui/material';
import { LoadingSpinner } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { SortableListItem } from '../../../../components/SortableListItem';
import { useReorderScenarioRules } from '../../hooks/useReorderScenarioRules';
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

    const handleReorder = useCallback(
        (event: {
            suspend: () => { resume: () => void; abort: () => void };
            canceled?: boolean;
            operation: any;
        }) => {
            if (event.canceled) return;

            const { source } = event.operation;

            if (isSortable(source)) {
                const { initialIndex, index } = source as {
                    initialIndex: number;
                    index: number;
                };
                if (initialIndex === index) return;

                const newOrder = arrayMove(rules, initialIndex, index);

                const { resume, abort } = event.suspend();

                reorderScenarioRules(
                    newOrder.map(r => r.id),
                    // abort doesn't work, a topic is open about it: https://github.com/clauderic/dnd-kit/issues/1769
                    { onSuccess: resume, onError: abort },
                );
            }
        },
        [reorderScenarioRules, rules],
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
                    <DragDropProvider onDragEnd={handleReorder}>
                        <List sx={styles.rulesContainer}>
                            {rules.map((rule, index) => (
                                <SortableListItem
                                    sx={styles.ruleBox}
                                    key={rule.id}
                                    id={rule.id ?? 0}
                                    index={index}
                                >
                                    <ScenarioRuleLine
                                        scenarioId={scenarioId}
                                        rule={rule}
                                    />
                                </SortableListItem>
                            ))}
                        </List>
                    </DragDropProvider>
                )}
            </CardContent>
        </Card>
    );
};
