import React, { FC, useCallback, useState } from 'react';
import { Card } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { usePlanningContext } from '../../contexts/PlanningContext';
import { ScenarioRule } from '../../types/scenarioRule';
import { ScenarioRuleFormWrapper } from './scenarioRuleForm/ScenarioRuleFormWrapper';
import { ScenarioRulesContainer } from './scenarioRuleList/ScenarioRulesContainer';

const styles: SxStyles = {
    card: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },
};

type Props = {
    scenarioId: number;
    rules: ScenarioRule[];
    isLoading: boolean;
    onPreviewScenarioRule?: (rule?: Partial<ScenarioRule>) => void;
};

export const ScenarioRulesPanel: FC<Props> = ({
    scenarioId,
    rules,
    isLoading,
    onPreviewScenarioRule,
}) => {
    const [editingRule, setEditingRule] = useState<ScenarioRule | undefined>();

    const { isEditing, toggleIsEditing } = usePlanningContext();

    const handleShowForm = useCallback(
        (rule?: ScenarioRule) => {
            setEditingRule(rule);
            toggleIsEditing();
            if (rule) {
                onPreviewScenarioRule?.(rule);
            }
        },
        [setEditingRule, toggleIsEditing, onPreviewScenarioRule],
    );

    const handleCloseForm = useCallback(() => {
        onPreviewScenarioRule?.(undefined);
        setEditingRule(undefined);
        toggleIsEditing();
    }, [onPreviewScenarioRule, setEditingRule, toggleIsEditing]);

    const handleFormChange = useCallback(
        (values: Partial<ScenarioRule>) => {
            if (
                (values.matching_criteria ?? []).length <= 0 ||
                !onPreviewScenarioRule
            ) {
                return;
            }

            onPreviewScenarioRule(values);
        },
        [onPreviewScenarioRule],
    );

    return (
        <Card sx={styles.card}>
            {isEditing ? (
                <ScenarioRuleFormWrapper
                    scenarioId={scenarioId}
                    rule={editingRule}
                    onClose={handleCloseForm}
                    onBlur={handleFormChange}
                />
            ) : (
                <ScenarioRulesContainer
                    onShowForm={handleShowForm}
                    scenarioId={scenarioId}
                    isLoading={isLoading}
                    rules={rules}
                />
            )}
        </Card>
    );
};
