import { UseMutationResult } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';

export const useCreateScenario = (): UseMutationResult => {
    const name = `New scenario - ${new Date().toLocaleString()}`;
    const currentYear = new Date().getFullYear();
    return useSnackMutation({
        mutationFn: () =>
            postRequest('/api/snt_malaria/scenarios/', {
                name,
                start_year: currentYear,
                end_year: currentYear + 3,
            }),
        invalidateQueryKey: ['scenarios'],
    });
};
