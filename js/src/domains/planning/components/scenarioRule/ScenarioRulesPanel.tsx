import React, { FC, Ref, useCallback } from 'react';
import { useGetColors } from 'Iaso/hooks/useGetColors';
import { CardScrollable } from '../../../../components/styledComponents';
import { usePlanningContext } from '../../contexts/PlanningContext';
import { ScenarioRule, ScenarioRulePreview } from '../../types/scenarioRule';
import { ScenarioRuleFormWrapper } from './scenarioRuleForm/ScenarioRuleFormWrapper';
import { ScenarioRulesContainer } from './scenarioRuleList/ScenarioRulesContainer';

type Props = {
    scenarioId: number;
    rules: ScenarioRule[];
    isLoading: boolean;
    onPreviewScenarioRule?: (preview?: ScenarioRulePreview) => void;
    createRuleRef?: Ref<HTMLButtonElement>;
    /** Whether the account has an AI API key configured - gates the AI Chat button. */
    hasAiApiKey?: boolean;
    showAIChat?: boolean;
    onToggleAIChat?: () => void;
};

export const ScenarioRulesPanel: FC<Props> = ({
    scenarioId,
    rules,
    isLoading,
    onPreviewScenarioRule,
    createRuleRef,
    hasAiApiKey,
    showAIChat,
    onToggleAIChat,
}) => {
    const { isEditing, editingRule, startEditingRule, stopEditingRule } =
        usePlanningContext();
    // Prefetches the palette so the form's lazy colour picker finds it warm
    // in the React Query cache when the form mounts.
    useGetColors();

    const handleShowForm = useCallback(
        (rule?: ScenarioRule) => startEditingRule(rule),
        [startEditingRule],
    );

    const handleCloseForm = useCallback(() => {
        onPreviewScenarioRule?.(undefined);
        stopEditingRule();
    }, [onPreviewScenarioRule, stopEditingRule]);

    return (
        <CardScrollable>
            {isEditing ? (
                <ScenarioRuleFormWrapper
                    scenarioId={scenarioId}
                    rule={editingRule}
                    existingRules={rules}
                    onClose={handleCloseForm}
                    onPreviewChange={onPreviewScenarioRule}
                />
            ) : (
                <ScenarioRulesContainer
                    onShowForm={handleShowForm}
                    scenarioId={scenarioId}
                    isLoading={isLoading}
                    rules={rules}
                    createRuleRef={createRuleRef}
                    hasAiApiKey={hasAiApiKey}
                    showAIChat={showAIChat}
                    onToggleAIChat={onToggleAIChat}
                />
            )}
        </CardScrollable>
    );
};
