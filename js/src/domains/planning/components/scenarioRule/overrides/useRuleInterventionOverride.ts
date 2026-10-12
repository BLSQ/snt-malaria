import { useCallback, useMemo } from 'react';
import { useGetExtendedFormikContext } from '../../../../../hooks/useGetExtendedFormikContext';
import { ScenarioRuleFormValues } from '../../../hooks/useScenarioRuleFormState';
import {
    emptyInterventionOverride,
    findInterventionOverride,
    replaceInterventionOverride,
} from '../../../libs/override-utils';
import { RuleInterventionOverride } from '../../../types/scenarioRule';

export const useRuleInterventionOverride = (interventionId: number) => {
    const { values, setFieldValueAndState } =
        useGetExtendedFormikContext<ScenarioRuleFormValues>();
    const overrides = values.intervention_overrides;

    const override = useMemo(
        () =>
            findInterventionOverride(overrides, interventionId) ??
            emptyInterventionOverride(interventionId),
        [overrides, interventionId],
    );

    const updateOverride = useCallback(
        (next: RuleInterventionOverride) =>
            setFieldValueAndState(
                'intervention_overrides',
                replaceInterventionOverride(overrides, next),
            ),
        [overrides, setFieldValueAndState],
    );

    return { override, updateOverride };
};
