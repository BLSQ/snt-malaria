import React, { ComponentProps, FC } from 'react';
import { ChatColumn } from '../../../../../components/styledComponents';
import { usePlanningContext } from '../../../contexts/PlanningContext';
import { ScenarioRuleAIChat } from './ScenarioRuleAIChat';

type Props = ComponentProps<typeof ScenarioRuleAIChat>;

/** Hidden while a rule is being edited: the AI saves rules directly, so it would go out of sync with the open form. */
export const ScenarioRuleAIChatColumn: FC<Props> = props => {
    const { isEditing } = usePlanningContext();
    if (isEditing) return null;
    return (
        <ChatColumn>
            <ScenarioRuleAIChat {...props} />
        </ChatColumn>
    );
};
