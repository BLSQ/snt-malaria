import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { makeUrlWithParams } from 'Iaso/libs/utils';
import { InterventionPlan } from '../types/interventions';

export const useGetInterventionsPlan = (
    scenarioId: number | undefined,
    orgUnitIds: number[],
    enabled: boolean,
): UseQueryResult<InterventionPlan[], Error> => {
    const params: Record<string, any> = {
        scenario_id: scenarioId,
        org_unit_ids: orgUnitIds.join(','),
        enabled,
    };
    const url = makeUrlWithParams(
        '/api/snt_malaria/interventionassignment/grouped_by_org_unit/',
        params,
    );
    return useSnackQuery({
        queryKey: ['interventionPlans', scenarioId, orgUnitIds],
        queryFn: () => getRequest(url),
        options: {
            staleTime: 1000 * 60 * 15,
            cacheTime: 1000 * 60 * 5,
            enabled,
            select: (data: InterventionPlan[]) => {
                return data;
            },
        },
    });
};
