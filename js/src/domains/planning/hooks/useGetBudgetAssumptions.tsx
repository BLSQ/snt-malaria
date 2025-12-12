import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { BudgetAssumptions } from '../types/interventions';

const percentageFields = [
    'coverage',
    'tablet_factor',
    'pop_prop_3_11',
    'pop_prop_12_59',
];

export const useGetBudgetAssumptions = (
    scenarioId: number,
): UseQueryResult<BudgetAssumptions[], Error> => {
    return useSnackQuery({
        queryKey: [`budget_assumptions_${scenarioId}`],
        queryFn: () =>
            getRequest(
                `/api/snt_malaria/budget_assumptions/?scenario=${scenarioId}`,
            ),
        options: {
            cacheTime: Infinity, // disable auto fetch on cache expiration
            select: (data: BudgetAssumptions[]) =>
                data.map(d =>
                    Object.entries(d).reduce((acc, [key, value]) => {
                        let newValue = value;
                        if (percentageFields.includes(key)) {
                            newValue = value * 100;
                        }

                        if (key === 'buffer_mult') {
                            newValue = value && (value - 1) * 100;
                        }

                        return { ...acc, [key]: newValue };
                    }, {} as any),
                ),
        },
    });
};
