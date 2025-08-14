import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { Intervention, InterventionPlan } from '../types/interventions';

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
    const plansWithMatchingIntervention = interventionPlans.filter(
        p => interventions[p.intervention.intervention_category],
    );

    const conflicts: InterventionAssignmentConflict[] = orgUnits.flatMap(ou => {
        return Object.entries(interventions).map(
            ([categoryId, intervention]) => ({
                orgUnit: ou,
                categoryId: Number(categoryId),
                interventions: [intervention],
                isConflicting: false,
            }),
        );
    });

    for (const orgUnit of orgUnits) {
        const categoryToInterventions: {
            [categoryId: number]: Intervention[];
        } = {};

        for (const plan of plansWithMatchingIntervention) {
            if (plan.org_units.some(o => o.id === orgUnit.id)) {
                const categoryId = plan.intervention.intervention_category;
                if (!categoryToInterventions[categoryId]) {
                    categoryToInterventions[categoryId] = [];
                }
                categoryToInterventions[categoryId].push(plan.intervention);
            }
        }

        Object.entries(categoryToInterventions).forEach(
            ([categoryId, conflictingInterventions]) => {
                if (conflictingInterventions.length > 0) {
                    const conflict =
                        conflicts.find(
                            c =>
                                c.categoryId === Number(categoryId) &&
                                c.orgUnit.id === orgUnit.id,
                        ) ??
                        ({
                            categoryId: Number(categoryId),
                            orgUnit,
                            interventions: [],
                            isConflicting: true,
                        } as InterventionAssignmentConflict);

                    conflict.isConflicting = true;
                    conflict.interventions = [
                        ...(conflict?.interventions ?? []),
                        ...conflictingInterventions,
                    ];
                }
            },
        );
    }

    return conflicts;
};
