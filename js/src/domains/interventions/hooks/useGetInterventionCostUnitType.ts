import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { DropdownOptions } from 'Iaso/types/utils';

export type InterventionCostUnitTypeOption = DropdownOptions<string> & {
    is_proportional: boolean;
};

export const indexCostUnitTypeOptions = (
    options: InterventionCostUnitTypeOption[],
): Record<string, InterventionCostUnitTypeOption> =>
    options.reduce<Record<string, InterventionCostUnitTypeOption>>(
        (acc, option) => {
            acc[String(option.value)] = option;
            return acc;
        },
        {},
    );

export const useGetInterventionCostUnitTypes = (): UseQueryResult<
    InterventionCostUnitTypeOption[],
    Error
> => {
    return useSnackQuery({
        queryKey: ['interventionCostUnitType'],
        queryFn: () =>
            getRequest(
                '/api/snt_malaria/intervention_cost_breakdown_lines/unit_types_dropdown/',
            ),
        options: {
            cacheTime: Infinity, // disable auto fetch on cache expiration
        },
    });
};
