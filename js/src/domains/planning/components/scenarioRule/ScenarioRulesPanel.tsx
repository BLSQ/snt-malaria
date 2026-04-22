import React, { FC, useCallback, useState } from 'react';
import { CardScrollable } from '../../../../components/styledComponents';
import { usePlanningContext } from '../../contexts/PlanningContext';
import { ScenarioRuleFormValues } from '../../hooks/useScenarioRuleFormState';
import { ScenarioRule } from '../../types/scenarioRule';
import { ScenarioRuleFormWrapper } from './scenarioRuleForm/ScenarioRuleFormWrapper';
import { ScenarioRulesContainer } from './scenarioRuleList/ScenarioRulesContainer';

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
        (values: Partial<ScenarioRuleFormValues>) => {
            if (!onPreviewScenarioRule) {
                return;
            }
            onPreviewScenarioRule(values);
        },
        [onPreviewScenarioRule],
    );

    return (
        <CardScrollable>
            {isEditing ? (
                <ScenarioRuleFormWrapper
                    scenarioId={scenarioId}
                    rule={editingRule}
                    onClose={handleCloseForm}
                    onChange={handleFormChange}
                />
            ) : (
                <ScenarioRulesContainer
                    onShowForm={handleShowForm}
                    scenarioId={scenarioId}
                    isLoading={isLoading}
                    rules={rules}
                />
            )}
        </CardScrollable>
    );
};
