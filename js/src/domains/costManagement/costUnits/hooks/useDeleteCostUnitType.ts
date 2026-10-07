import { deleteRequest } from 'bluesquare-components';
import { UseMutationResult } from 'react-query';
import { useSnackMutation } from 'Iaso/libs/apiHooks';

export const useDeleteCostUnitType = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: (costUnitTypeId: number) =>
            deleteRequest(
                `/api/snt_malaria/cost_unit_types/${costUnitTypeId}/`,
            ),
        invalidateQueryKey: ['costUnitTypes'],
    });
