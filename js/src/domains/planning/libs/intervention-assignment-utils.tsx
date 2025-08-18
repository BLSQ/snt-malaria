import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { Intervention, InterventionPlan } from '../types/interventions';

const getDefaultConflicts = (
    orgUnits: OrgUnit[],
    interventions: { [categoryId: number]: Intervention },
): InterventionAssignmentConflict[] =>
    orgUnits.flatMap(ou => {
        return Object.entries(interventions).map(
            ([categoryId, intervention]) => ({
                orgUnit: ou,
                categoryId: Number(categoryId),
                interventions: [intervention],
                isConflicting: false,
            }),
        );
    });

const getConflictOrDefault = (
    conflicts: InterventionAssignmentConflict[],
    categoryId: number,
    orgUnit: OrgUnit,
) => {
    return (
        conflicts.find(
            c =>
                c.categoryId === Number(categoryId) &&
                c.orgUnit.id === orgUnit.id,
        ) ??
        ({
            categoryId: Number(categoryId),
            orgUnit,
            interventions: [],
            isConflicting: false,
        } as InterventionAssignmentConflict)
    );
};

const getUniqueInterventions = (
    interventionsToAdd: Intervention[],
    sourceInterventions: Intervention[],
) =>
    interventionsToAdd.filter(
        a => !sourceInterventions.some(b => a.id === b.id),
    );

const getInterventionsPerCategory = (
    orgUnitId: number,
    plans: InterventionPlan[],
) => {
    const categoryToInterventions: {
        [categoryId: number]: Intervention[];
    } = {};

    for (const plan of plans) {
        if (plan.org_units.some(o => o.id === orgUnitId)) {
            const categoryId = plan.intervention.intervention_category;
            if (!categoryToInterventions[categoryId]) {
                categoryToInterventions[categoryId] = [];
            }

            if (
                !categoryToInterventions[categoryId].some(
                    i => i.id === plan.intervention.id,
                )
            ) {
                categoryToInterventions[categoryId].push(plan.intervention);
            }
        }
    }

    return categoryToInterventions;
};

export type InterventionAssignmentConflict = {
    orgUnit: OrgUnit;
    categoryId: number;
    interventions: Intervention[];
    isConflicting: boolean;
};

export const getConflictingAssignments = (
    orgUnits: OrgUnit[],
    interventions: { [categoryId: number]: Intervention },
    interventionPlans: InterventionPlan[],
) => {
    // Interventions which are part of same category than intervention of plans
    const plansWithMatchingIntervention = interventionPlans.filter(
        p => interventions[p.intervention.intervention_category],
    );

    // Create base conflicts with selected intervention.
    const conflicts: InterventionAssignmentConflict[] = getDefaultConflicts(
        orgUnits,
        interventions,
    );

    // Time to generate conflict per org unit
    for (const orgUnit of orgUnits) {
        const categoryToInterventions: {
            [categoryId: number]: Intervention[];
        } = getInterventionsPerCategory(
            orgUnit.id,
            plansWithMatchingIntervention,
        );

        Object.entries(categoryToInterventions).forEach(
            ([categoryId, conflictingInterventions]) => {
                if (conflictingInterventions.length > 0) {
                    const conflict = getConflictOrDefault(
                        conflicts,
                        Number(categoryId),
                        orgUnit,
                    );

                    // Filter out interventions already in conflict
                    const uniqueNewInterventions = getUniqueInterventions(
                        conflictingInterventions,
                        conflict.interventions,
                    );

                    // Only modify conflic if new interventions
                    if (uniqueNewInterventions.length > 0) {
                        conflict.isConflicting = true;
                        conflict.interventions = [
                            ...(conflict.interventions ?? []),
                            ...conflictingInterventions,
                        ];
                    }
                }
            },
        );
    }

    return conflicts;
};
