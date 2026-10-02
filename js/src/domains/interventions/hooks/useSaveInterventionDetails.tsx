import { putRequest } from 'bluesquare-components';
import { QueryKey, UseMutationResult } from 'react-query';
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

// Partial match invalidates every ['interventionDetails', id] query key.
const DEFAULT_INVALIDATED_QUERY_KEYS: QueryKey = [
    'interventionDetails',
    'interventionCategories',
    COST_BREAKDOWN_LINES_QUERY_KEY[0],
    'calculated_budget',
];

export const useSaveInterventionDetails = (
    invalidateQueryKey: QueryKey = DEFAULT_INVALIDATED_QUERY_KEYS,
): UseMutationResult =>
    useSnackMutation({
        mutationFn: ({
            interventionId,
            ...body
        }: SaveInterventionDetailsBody) =>
            putRequest(
                `/api/snt_malaria/interventions/${interventionId}/update_details/`,
                body,
            ),
        invalidateQueryKey,
        showSuccessSnackBar: false,
    });
