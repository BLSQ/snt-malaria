import { putRequest } from 'bluesquare-components';
import { UseMutationResult } from 'react-query';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import {
    InterventionCostBreakdownLinePayload,
    InterventionDetails,
} from '../types';
import { COST_BREAKDOWN_LINES_QUERY_KEY } from './useGetCostBreakdownLines';

type SaveInterventionDetailsBody = Partial<
    Omit<InterventionDetails, 'cost_breakdown_lines'>
> & {
    interventionId: number;
    cost_breakdown_lines?: InterventionCostBreakdownLinePayload[];
};

export const useSaveInterventionDetails = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: ({
            interventionId,
            ...body
        }: SaveInterventionDetailsBody) =>
            putRequest(
                `/api/snt_malaria/interventions/${interventionId}/update_details/`,
                body,
            ),
        // Partial match invalidates every ['interventionDetails', id] query key.
        invalidateQueryKey: [
            'interventionDetails',
            'interventionCategories',
            COST_BREAKDOWN_LINES_QUERY_KEY[0],
            'calculated_budget',
        ],
        showSuccessSnackBar: false,
    });
