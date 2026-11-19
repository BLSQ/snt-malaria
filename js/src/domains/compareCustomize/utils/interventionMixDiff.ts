import { Intervention } from '../../interventions/types/intervention';

export type InterventionMixChange = 'same' | 'added' | 'removed';

export type InterventionMixItem = {
    id: number;
    label: string;
    change: InterventionMixChange;
};

/**
 * Lists a district's interventions against the baseline's: the ones the scenario adds first,
 * then the ones both share, then the ones it drops. Without a baseline every intervention is `same`.
 */
export const buildInterventionMixDiff = (
    interventions: Intervention[],
    baselineInterventions?: Intervention[],
): InterventionMixItem[] => {
    const toItem = (
        intervention: Intervention,
        change: InterventionMixChange,
    ): InterventionMixItem => ({
        id: intervention.id,
        label: intervention.short_name,
        change,
    });
    if (!baselineInterventions) {
        return interventions.map(intervention => toItem(intervention, 'same'));
    }
    const baselineIds = new Set(baselineInterventions.map(({ id }) => id));
    const ids = new Set(interventions.map(({ id }) => id));
    return [
        ...interventions
            .filter(({ id }) => !baselineIds.has(id))
            .map(intervention => toItem(intervention, 'added')),
        ...interventions
            .filter(({ id }) => baselineIds.has(id))
            .map(intervention => toItem(intervention, 'same')),
        ...baselineInterventions
            .filter(({ id }) => !ids.has(id))
            .map(intervention => toItem(intervention, 'removed')),
    ];
};
