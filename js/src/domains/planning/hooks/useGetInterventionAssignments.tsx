import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { makeUrlWithParams } from 'Iaso/libs/utils';
import {
    InterventionAssignmentResponse,
    InterventionPlan,
} from '../types/interventions';

export const useGetInterventionAssignments = (
    scenarioId,
): UseQueryResult<InterventionPlan[], Error> => {
    const params: Record<string, any> = { scenario_id: scenarioId };
    const url = makeUrlWithParams(
        '/api/snt_malaria/intervention_assignments/',
        params,
    );

    return useSnackQuery({
        queryKey: [
            'interventionAssignments',
            `interventionAssignments_${scenarioId}`,
        ],
        queryFn: () => getRequest(url),
        options: {
            staleTime: 1000 * 60 * 15, // in MS
            refetchOnWindowFocus: false, // This is only needed with staleTime set
            cacheTime: Infinity, // disable auto fetch on cache expiration
            select: (data: InterventionAssignmentResponse[]) => {
                return data.reduce((acc: InterventionPlan[], assignment) => {
                    const existingPlan = acc.find(
                        plan =>
                            plan.intervention.id === assignment.intervention.id,
                    );

                    const assignmentOrgUnit = {
                        name: assignment.org_unit.name,
                        id: assignment.org_unit.id,
                        intervention_assignment_id: assignment.id,
                    };

                    if (existingPlan) {
                        existingPlan.org_units.push(assignmentOrgUnit);
                    } else {
                        acc.push({
                            name: `Scenario ${assignment.scenario_id}`,
                            intervention: assignment.intervention,
                            org_units: [assignmentOrgUnit],
                        });
                    }

                    return acc;
                }, []);
            },
            enabled: Boolean(scenarioId),
        },
    });
};
