import { UseMutationResult } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { ScenarioFormValues } from './useScenarioFormState';

export const useCreateScenario = (): UseMutationResult => {
    return useSnackMutation({
        mutationFn: ({
            name,
            description,
            start_year,
            end_year,
        }: ScenarioFormValues) =>
            postRequest('/api/snt_malaria/scenarios/', {
                name,
                description,
                start_year,
                end_year,
            }),
        invalidateQueryKey: ['scenarios'],
    });
};
