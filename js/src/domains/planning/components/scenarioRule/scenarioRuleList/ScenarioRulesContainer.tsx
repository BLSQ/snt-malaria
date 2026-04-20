import React, { FC, useCallback } from 'react';
import { AsyncSortableList } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { CardStyled } from '../../../../../components/CardStyled';
import { useReorderScenarioRules } from '../../../hooks/useReorderScenarioRules';
import { ScenarioRule } from '../../../types/scenarioRule';
import { ScenarioRuleLine } from './ScenarioRuleLine';
import { ScenarioRulesHeader } from './ScenarioRulesHeader';
import { usePlanningContext } from '../../../contexts/PlanningContext';

const styles: SxStyles = {
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
        '&:last-child': {
            mb: 0,
        },
        cursor: 'grab',
        '&:active': {
            cursor: 'grabbing',
        },
    },
};

type Props = {
    scenarioId: number;
    isLoading: boolean;
    onShowForm: (rule?: ScenarioRule) => void;
    rules: ScenarioRule[];
};

type ReorderScenarioRulesParams = {
    resume: () => void;
    abort: () => void;
    items: ScenarioRule[];
};

export const ScenarioRulesContainer: FC<Props> = ({
    scenarioId,
    isLoading,
    onShowForm,
    rules,
}) => {
    const { mutate: reorderScenarioRules } =
        useReorderScenarioRules(scenarioId);
    const { isScenarioEditable } = usePlanningContext();

    const handleReorder = useCallback(
        ({ resume, abort, items }: ReorderScenarioRulesParams) => {
            reorderScenarioRules(
                items.map(r => r.id),
                // abort doesn't work, a topic is open about it: https://github.com/clauderic/dnd-kit/issues/1769
                { onSuccess: resume, onError: abort },
            );
        },
        [reorderScenarioRules],
    );

    return (
        <CardStyled
            header={<ScenarioRulesHeader onCreateRule={onShowForm} />}
            isLoading={isLoading}
        >
            <AsyncSortableList
                items={rules}
                onDragEnd={handleReorder}
                listSx={styles.rulesContainer}
                itemSx={styles.ruleBox}
                disabled={!isScenarioEditable}
                RenderItem={({ item }) => (
                    <ScenarioRuleLine
                        scenarioId={scenarioId}
                        rule={item}
                        onEdit={onShowForm}
                    />
                )}
            ></AsyncSortableList>
        </CardStyled>
    );
};
