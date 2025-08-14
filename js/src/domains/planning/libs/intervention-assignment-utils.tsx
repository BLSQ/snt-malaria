import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { Intervention, InterventionPlan } from '../types/interventions';

export type InterventionAssignmentConflict = {
    orgUnit: OrgUnit;
    interventionId: number;
    assignedInterventions: Intervention[];
};

export const getConflictingAssignments = (
    orgUnits: OrgUnit[],
    interventions: { [categoryId: number]: number },
    interventionPlans: InterventionPlan[],
) => {
    const plansWithMatchingIntervention = interventionPlans.filter(
        p => interventions[p.intervention.intervention_category],
    );

    const conflicts: InterventionAssignmentConflict[] = [];

    for (const orgUnit of orgUnits) {
        const categoryToPlans: { [categoryId: number]: InterventionPlan[] } =
            {};

        for (const plan of plansWithMatchingIntervention) {
            if (plan.org_units.some(o => o.id === orgUnit.id)) {
                const categoryId = plan.intervention.intervention_category;
                if (!categoryToPlans[categoryId]) {
                    categoryToPlans[categoryId] = [];
                }
                categoryToPlans[categoryId].push(plan);
            }
        }

        Object.entries(categoryToPlans).forEach(([categoryId, plans]) => {
            if (plans.length > 0) {
                conflicts.push({
                    orgUnit,
                    interventionId: Number(categoryId),
                    assignedInterventions: plans.map(p => p.intervention),
                });
            }
        });
    }

    return conflicts;
};
