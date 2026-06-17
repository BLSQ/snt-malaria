import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { UseMutationResult } from 'react-query';

export const useCreateDonor = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: (name: string) =>
            postRequest('/api/snt_malaria/donors/', { name }),
        invalidateQueryKey: ['donors'],
    });
