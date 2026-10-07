import { useCallback } from 'react';
import { useQueryClient } from 'react-query';
import { deleteRequest, patchRequest, postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { COST_BREAKDOWN_LINES_QUERY_KEY } from '../../../interventions/hooks/useGetCostBreakdownLines';
import {
    InterventionCostBreakdownLine,
    InterventionCostBreakdownLinePayload,
} from '../../../interventions/types';

const COST_LINES_URL = '/api/snt_malaria/intervention_cost_breakdown_lines/';

// Lines are kept up to date in the cache by this hook, so only the
// queries derived from them need refetching.
const INVALIDATED_QUERY_KEYS = ['interventionDetails', 'calculated_budget'];

type LineChanges = Partial<InterventionCostBreakdownLinePayload>;

export const useSaveCostItems = () => {
    const queryClient = useQueryClient();

    const { mutateAsync: createLine } = useSnackMutation<
        InterventionCostBreakdownLine,
        unknown,
        InterventionCostBreakdownLinePayload
    >({
        mutationFn: line => postRequest(COST_LINES_URL, line),
        invalidateQueryKey: INVALIDATED_QUERY_KEYS,
        showSuccessSnackBar: false,
    });
    const { mutateAsync: patchLine } = useSnackMutation<
        InterventionCostBreakdownLine,
        unknown,
        LineChanges & { id: number }
    >({
        mutationFn: ({ id, ...changes }) =>
            patchRequest(`${COST_LINES_URL}${id}/`, changes),
        invalidateQueryKey: INVALIDATED_QUERY_KEYS,
        showSuccessSnackBar: false,
    });
    const { mutateAsync: removeLine } = useSnackMutation<
        boolean,
        unknown,
        number
    >({
        mutationFn: id => deleteRequest(`${COST_LINES_URL}${id}/`),
        invalidateQueryKey: INVALIDATED_QUERY_KEYS,
        showSuccessSnackBar: false,
    });

    const setCachedLines = useCallback(
        (
            update: (
                lines: InterventionCostBreakdownLine[],
            ) => InterventionCostBreakdownLine[],
        ) =>
            queryClient.setQueryData<InterventionCostBreakdownLine[]>(
                COST_BREAKDOWN_LINES_QUERY_KEY,
                previous => update(previous ?? []),
            ),
        [queryClient],
    );

    const refetchLines = useCallback(
        () => queryClient.invalidateQueries(COST_BREAKDOWN_LINES_QUERY_KEY),
        [queryClient],
    );

    // Inline edits only touch plain values, so the cache is updated upfront
    // and the response isn't needed; a failure refetches to revert it.
    const updateLine = useCallback(
        async (lineId: number, changes: LineChanges) => {
            setCachedLines(lines =>
                lines.map(line =>
                    line.id === lineId ? { ...line, ...changes } : line,
                ),
            );
            try {
                await patchLine({ ...changes, id: lineId });
            } catch {
                refetchLines();
            }
        },
        [patchLine, refetchLines, setCachedLines],
    );

    // The response is used here because it carries the server-side labels
    // (category, unit type, population layer) the edit may have changed.
    const saveLine = useCallback(
        async (line: InterventionCostBreakdownLinePayload) => {
            if (line.id === undefined) {
                const created = await createLine(line);
                setCachedLines(lines => [...lines, created]);
                return;
            }
            const saved = await patchLine({ ...line, id: line.id });
            setCachedLines(lines =>
                lines.map(cached => (cached.id === saved.id ? saved : cached)),
            );
        },
        [createLine, patchLine, setCachedLines],
    );

    const deleteLine = useCallback(
        async (lineId: number) => {
            setCachedLines(lines => lines.filter(line => line.id !== lineId));
            try {
                await removeLine(lineId);
            } catch {
                refetchLines();
            }
        },
        [refetchLines, removeLine, setCachedLines],
    );

    return { updateLine, saveLine, deleteLine };
};
