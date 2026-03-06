import { getColorRange } from '../../planning/libs/color-utils';
import {
    Intervention,
    InterventionPlan,
} from '../../planning/types/interventions';
import { getInterventionGroupShades } from './colors';
import { ALL_INTERVENTIONS_ID } from './constants';

export interface InterventionGroup {
    color: string;
    interventionsKey: string;
    label: string;
    orgUnitIds: number[];
}

const getInterventionsGroupKey = (interventions: Intervention[]) =>
    interventions.map(i => i.id).join('--');

const getInterventionsGroupLabel = (interventions: Intervention[]) =>
    interventions.map(i => i.short_name).join(' + ');

/**
 * Inverts a flat list of intervention plans into a Map that associates
 * each org-unit id with the interventions assigned to it.
 */
export const buildOrgUnitLookup = (
    plans: InterventionPlan[],
): Map<number, Intervention[]> => {
    return plans.reduce((acc, plan) => {
        plan.org_units.forEach(orgUnit => {
            const existing = acc.get(orgUnit.id) ?? [];
            existing.push(plan.intervention);
            acc.set(orgUnit.id, existing);
        });
        return acc;
    }, new Map<number, Intervention[]>());
};

/**
 * Groups org units that share the same intervention combination and assigns
 * each group a distinct color derived from `selectedColor` (or a default
 * palette when no color is provided).
 */
export const buildInterventionGroups = (
    orgUnitInterventions: Map<number, Intervention[]>,
    selectedColor: string,
): InterventionGroup[] => {
    const groups = [...orgUnitInterventions].reduce(
        (acc, [orgUnitId, interventions]) => {
            if (interventions.length === 0) return acc;

            const key = getInterventionsGroupKey(interventions);
            const existing = acc.find(g => g.interventionsKey === key);
            if (existing) {
                existing.orgUnitIds.push(orgUnitId);
                return acc;
            }

            return [
                ...acc,
                {
                    interventionsKey: key,
                    color: selectedColor,
                    label: getInterventionsGroupLabel(interventions),
                    orgUnitIds: [orgUnitId],
                },
            ];
        },
        [] as InterventionGroup[],
    );

    const colors =
        selectedColor && groups.length > 0
            ? getInterventionGroupShades(selectedColor, groups.length)
            : getColorRange(groups.length);

    return groups.map((group, index) => ({
        ...group,
        color: colors[index % colors.length],
    }));
};

/**
 * Returns the org-unit ids that have a specific intervention assigned.
 * When `selectedId` is 0 (= "all"), returns every org-unit id in the lookup.
 */
export const getOrgUnitsForIntervention = (
    selectedId: number,
    orgUnitInterventions: Map<number, Intervention[]>,
): Set<number> => {
    if (selectedId === ALL_INTERVENTIONS_ID)
        return new Set(orgUnitInterventions.keys());
    const result = new Set<number>();
    for (const [id, interventions] of orgUnitInterventions) {
        if (interventions.some(i => i.id === selectedId)) {
            result.add(id);
        }
    }
    return result;
};
