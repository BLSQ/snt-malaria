import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import {
    ORG_UNIT_IDS_API_PARAM,
    serializeOrgUnitIds,
} from '../../../utils/orgUnitIdsParam';
import { BudgetCalculationResponse } from '../types/budget';

export const useGetScenarioBudget = (
    scenarioId?: number,
    orgUnitIds: number[] = [],
): UseQueryResult<BudgetCalculationResponse, Error> => {
    const params = new URLSearchParams({ scenario_id: String(scenarioId) });
    const serializedOrgUnitIds = serializeOrgUnitIds(orgUnitIds);
    if (serializedOrgUnitIds) {
        params.set(ORG_UNIT_IDS_API_PARAM, serializedOrgUnitIds);
    }
    return useSnackQuery({
        queryKey: [
            'calculated_budget',
            `calculated_budget_${scenarioId}`,
            serializedOrgUnitIds,
        ],
        queryFn: () =>
            getRequest(`/api/snt_malaria/budgets/?${params.toString()}`),
        options: {
            staleTime: Infinity,
            cacheTime: Infinity,
            keepPreviousData: true,
            enabled: Boolean(scenarioId),
            retry: false,
            refetchOnWindowFocus: false,
        },
        ignoreErrorCodes: [404],
    });
};
