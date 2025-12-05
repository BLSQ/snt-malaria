import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { InterventionBudgetSettings } from '../types/interventions';

export const useGetBudgetSettingsOverrides = (
    scenarioId,
): UseQueryResult<InterventionBudgetSettings[], Error> => {
    return useSnackQuery({
        queryKey: [`budget_settings_overrides_${scenarioId}`],
        queryFn: () =>
            getRequest(
                `/api/snt_malaria/budget_settings_overrides/?scenario_id=${scenarioId}`,
            ),
        options: {
            cacheTime: Infinity, // disable auto fetch on cache expiration
        },
    });
};
