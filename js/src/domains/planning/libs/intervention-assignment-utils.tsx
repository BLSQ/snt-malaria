import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { Intervention } from '../types/interventions';

export type InterventionAssignmentConflict = {
    orgUnit: OrgUnit;
    categoryId: number;
    interventions: Intervention[];
    isConflicting: boolean;
};

const createConflict = (orgUnitId: string, interventionCategory: number) => ({
    orgUnit: { id: Number(orgUnitId) } as OrgUnit,
    categoryId: interventionCategory,
    interventions: [],
    isConflicting: false,
});

const getInitialConflictMap = (existingAssignments: {
    [orgUnitId: number]: Intervention[];
}) => {
    const conflictMap: {
        [key: string]: InterventionAssignmentConflict;
    } = {};
    Object.entries(existingAssignments).forEach(
        ([orgUnitId, interventions]) => {
            interventions.forEach(intervention => {
                const key = `${orgUnitId}_${intervention.intervention_category}`;
                if (!conflictMap[key]) {
                    conflictMap[key] = createConflict(
                        orgUnitId,
                        intervention.intervention_category,
                    );
                }
                conflictMap[key].interventions.push(intervention);
            });
        },
    );

    return conflictMap;
};

/***
 * Checks for conflicting assignments between selected interventions and existing plans.
 * an array of InterventionAssignmentConflict objects is returned containing all assignments with a isConflicting flag.
 * It also contains all existing assignments for the org units, which will have the isConflicting flag as false.
 * Note: interventions parameter should contains all interventions we want to add, conflict detection will be based on that list.
 */
export const getConflictingAssignments = (
    orgUnitAssignments: { [orgUnitId: number]: Intervention[] },
    existingAssignments: { [orgUnitId: number]: Intervention[] },
): InterventionAssignmentConflict[] => {
    const conflictMap: {
        [key: string]: InterventionAssignmentConflict;
    } = getInitialConflictMap(existingAssignments);

    // Add new assignments, merge interventions, and set isConflicting if more than one intervention in the same category
    Object.entries(orgUnitAssignments).forEach(([orgUnitId, interventions]) => {
        interventions.forEach(intervention => {
            const key = `${orgUnitId}_${intervention.intervention_category}`;
            if (!conflictMap[key]) {
                conflictMap[key] = createConflict(
                    orgUnitId,
                    intervention.intervention_category,
                );
            }
            // Only add if not already present
            if (
                !conflictMap[key].interventions.some(
                    i => i.id === intervention.id,
                )
            ) {
                conflictMap[key].interventions.push(intervention);
            }
            // Mark as conflicting if more than one intervention in the same category
            if (conflictMap[key].interventions.length > 1) {
                conflictMap[key].isConflicting = true;
            }
        });
    });

    return Object.values(conflictMap);
};
