import { useSnackQuery } from 'Iaso/libs/apiHooks';

export const useGetBudget = (scenarioId: number) => {
    return useSnackQuery({
        queryKey: ['budget', `budget_${scenarioId}`],
        queryFn: () => {},
    });
};
