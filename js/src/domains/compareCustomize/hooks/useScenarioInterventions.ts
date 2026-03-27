import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { useGetInterventionAssignments } from '../../planning/hooks/useGetInterventionAssignments';
import { sortByStringProp } from '../../planning/libs/list-utils';
import { Intervention } from '../../planning/types/interventions';
import { MESSAGES } from '../../messages';
import { ScenarioId, toNumericId } from '../types';
import { ALL_INTERVENTIONS_ID } from '../utils/constants';

type Params = {
    baselineScenarioId: ScenarioId;
    comparisonScenarioIds: ScenarioId[];
};

/**
 * Aggregates intervention assignments from the baseline and comparison
 * scenarios into a deduplicated, sorted list. Provides a select-ready
 * options array (with an "All interventions" entry) and keeps the
 * selected intervention id in sync when scenarios change.
 */
export const useScenarioInterventions = ({
    baselineScenarioId,
    comparisonScenarioIds,
}: Params) => {
    const { formatMessage } = useSafeIntl();
    const [selectedInterventionId, setSelectedInterventionId] =
        useState<number>(ALL_INTERVENTIONS_ID);

    const scenarioId = toNumericId(baselineScenarioId);
    const comparisonScenarioId1 = toNumericId(comparisonScenarioIds[0]);
    const comparisonScenarioId2 = toNumericId(comparisonScenarioIds[1]);

    const { data: baselineInterventionAssignments } =
        useGetInterventionAssignments(scenarioId);
    const { data: comparisonInterventionAssignments1 } =
        useGetInterventionAssignments(comparisonScenarioId1);
    const { data: comparisonInterventionAssignments2 } =
        useGetInterventionAssignments(comparisonScenarioId2);

    const interventions = useMemo(() => {
        const allAssignments = [
            ...(scenarioId ? baselineInterventionAssignments ?? [] : []),
            ...(comparisonScenarioId1
                ? comparisonInterventionAssignments1 ?? []
                : []),
            ...(comparisonScenarioId2
                ? comparisonInterventionAssignments2 ?? []
                : []),
        ];
        const uniqueById = new Map<number, Intervention>();
        allAssignments.forEach(({ intervention }) => {
            uniqueById.set(intervention.id, intervention);
        });
        return sortByStringProp([...uniqueById.values()], 'name');
    }, [
        baselineInterventionAssignments,
        comparisonInterventionAssignments1,
        comparisonInterventionAssignments2,
        scenarioId,
        comparisonScenarioId1,
        comparisonScenarioId2,
    ]);

    useEffect(() => {
        if (!interventions.length) {
            setSelectedInterventionId(ALL_INTERVENTIONS_ID);
            return;
        }
        if (
            selectedInterventionId !== ALL_INTERVENTIONS_ID &&
            !interventions.some(i => i.id === selectedInterventionId)
        ) {
            setSelectedInterventionId(ALL_INTERVENTIONS_ID);
        }
    }, [interventions, selectedInterventionId]);

    const interventionOptions = useMemo(() => {
        const items = interventions.map(intervention => ({
            label: intervention.short_name,
            value: intervention.id,
        }));
        return items.length > 0
            ? [
                  {
                      label: formatMessage(MESSAGES.allInterventions),
                      value: ALL_INTERVENTIONS_ID,
                  },
                  ...items,
              ]
            : [];
    }, [formatMessage, interventions]);

    const hasInterventions = interventionOptions.length > 0;

    const handleInterventionSelect = useCallback(
        (_key: string, value: unknown) => {
            setSelectedInterventionId(
                (value as number) ?? ALL_INTERVENTIONS_ID,
            );
        },
        [],
    );

    return {
        selectedInterventionId,
        interventionOptions,
        hasInterventions,
        handleInterventionSelect,
    };
};
