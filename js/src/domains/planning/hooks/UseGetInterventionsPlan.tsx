import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { makeUrlWithParams } from 'Iaso/libs/utils';
import { UseQueryResult } from 'react-query';
import { InterventionPlan } from '../types/interventions';

export const useGetInterventionsPlan = (
    scenarioId,
    selectedOrgUnits,
    mixApplied,
): UseQueryResult<InterventionPlan[], Error> => {
    const params: Record<string, any> = {
        scenario_id: scenarioId,
        org_unit_ids: selectedOrgUnits,
    };
    const url = makeUrlWithParams(
        '/api/snt_malaria/interventionassignments/grouped_by_mix/',
        params,
    );

    return useSnackQuery({
        queryKey: ['interventionPlans', scenarioId, mixApplied],
        queryFn: () => getRequest(url),
        options: {
            staleTime: 1000 * 60 * 15,
            cacheTime: 1000 * 60 * 5,
            select: (data: InterventionPlan[]) => {
                return data;
            },
            enabled: Boolean(scenarioId) && mixApplied,
        },
    });
};
