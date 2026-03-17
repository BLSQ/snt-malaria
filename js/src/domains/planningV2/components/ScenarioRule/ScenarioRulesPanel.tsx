import React, { FC, useCallback, useState } from 'react';
import { Card } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { ScenarioRule } from '../../types/scenarioRule';
import { ScenarioRuleFormWrapper } from './ScenarioRuleForm/ScenarioRuleFormWrapper';
import { ScenarioRulesContainer } from './ScenarioRuleList/ScenarioRulesContainer';

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
    onPreviewScenarioRule?: (rule: Partial<ScenarioRule>) => void;
};

export const ScenarioRulesPanel: FC<Props> = ({
    scenarioId,
    rules,
    isLoading,
    onPreviewScenarioRule,
}) => {
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [editingRule, setEditingRule] = useState<ScenarioRule | undefined>();

    const handleShowForm = useCallback(
        (rule?: ScenarioRule) => {
            setEditingRule(rule);
            setIsEditing(true);
        },
        [setEditingRule, setIsEditing],
    );

    const handleCloseForm = useCallback(() => {
        setEditingRule(undefined);
        setIsEditing(false);
    }, [setEditingRule, setIsEditing]);

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
