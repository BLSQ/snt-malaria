import { deleteRequest } from 'bluesquare-components';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { UseMutationResult } from 'react-query';

export const useDeleteCostUnitType = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: (costUnitTypeId: number) =>
            deleteRequest(
                `/api/snt_malaria/cost_unit_types/${costUnitTypeId}/`,
            ),
        invalidateQueryKey: ['costUnitTypes'],
    });
