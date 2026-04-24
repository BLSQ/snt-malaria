import React, { FC, useCallback, useState } from 'react';
import { useGetColors } from 'Iaso/hooks/useGetColors';
import { CardScrollable } from '../../../../components/styledComponents';
import { usePlanningContext } from '../../contexts/PlanningContext';
import {
    defaultScenarioRuleValues,
    ScenarioRuleFormValues,
} from '../../hooks/useScenarioRuleFormState';
import { pickRandomPaletteColor } from '../../libs/color-utils';
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
    const [newRuleColor, setNewRuleColor] = useState<string>(
        defaultScenarioRuleValues.color,
    );

    const { isEditing, toggleIsEditing } = usePlanningContext();
    // Prefetches the palette so the colour is ready by the time the user
    // clicks "create new rule".
    const { data: palette } = useGetColors();

    const handleShowForm = useCallback(
        (rule?: ScenarioRule) => {
            setEditingRule(rule);
            if (!rule) {
                const usedColors = rules.map(r => r.color).filter(Boolean);
                setNewRuleColor(
                    pickRandomPaletteColor(
                        palette ?? [],
                        usedColors,
                        defaultScenarioRuleValues.color,
                    ),
                );
            }
            toggleIsEditing();
            if (rule) {
                onPreviewScenarioRule?.(rule);
            }
        },
        [rules, palette, toggleIsEditing, onPreviewScenarioRule],
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
                    initialColor={
                        editingRule ? editingRule.color : newRuleColor
                    }
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
