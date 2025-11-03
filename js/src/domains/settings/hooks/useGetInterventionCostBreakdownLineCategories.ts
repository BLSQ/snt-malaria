import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { DropdownOptions } from 'Iaso/types/utils';

export const useGetInterventionCostBreakdownLineCategories = (): UseQueryResult<
    DropdownOptions<string>[],
    Error
> => {
    return useSnackQuery({
        queryKey: ['interventionCostBreakdownLineCategories'],
        queryFn: () =>
            getRequest(
                '/api/snt_malaria/intervention_cost_breakdown_lines/categories/',
            ),
    });
};
