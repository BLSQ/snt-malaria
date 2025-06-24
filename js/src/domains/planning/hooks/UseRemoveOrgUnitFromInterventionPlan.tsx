import { UseMutationResult } from 'react-query';
import { deleteRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';

export const UseRemoveOrgUnitFromInterventionPlan = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: ({ scenarioId, interventionMixId, orgUnitId }) =>
            deleteRequest(
                `/api/snt_malaria/interventionassignments/?scenario_id=${scenarioId}&intervention_mix_id=${interventionMixId}&org_unit_id=${orgUnitId}`,
            ),
        invalidateQueryKey: ['interventionPlans'],
    });
