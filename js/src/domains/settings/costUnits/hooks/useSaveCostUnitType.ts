import { patchRequest, postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { UseMutationResult } from 'react-query';
import { CostUnitTypePayload } from '../types';

export const useSaveCostUnitType = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: (body: CostUnitTypePayload) =>
            body.id
                ? patchRequest(
                      `/api/snt_malaria/cost_unit_types/${body.id}/`,
                      body,
                  )
                : postRequest('/api/snt_malaria/cost_unit_types/', body),
        invalidateQueryKey: ['costUnitTypes'],
    });
