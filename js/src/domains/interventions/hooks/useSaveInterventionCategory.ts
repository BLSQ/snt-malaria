import { UseMutationResult } from 'react-query';
import { patchRequest, postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { InterventionCategoryPayload } from '../types';

export const useSaveInterventionCategory = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: (body: InterventionCategoryPayload) =>
            body.id
                ? patchRequest(
                      `/api/snt_malaria/intervention_categories/${body.id}/`,
                      body,
                  )
                : postRequest(
                      '/api/snt_malaria/intervention_categories/',
                      body,
                  ),
        invalidateQueryKey: ['interventionCategories'],
    });
