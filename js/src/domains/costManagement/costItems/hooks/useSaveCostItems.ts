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

// Saved lines are written to the cache from the responses, so only the
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

    const replaceCachedLine = useCallback(
        (saved: InterventionCostBreakdownLine) =>
            setCachedLines(lines =>
                lines.map(line => (line.id === saved.id ? saved : line)),
            ),
        [setCachedLines],
    );

    const refetchLines = useCallback(
        () => queryClient.invalidateQueries(COST_BREAKDOWN_LINES_QUERY_KEY),
        [queryClient],
    );

    // Applied to the cache first so the row shows the new value while saving.
    const patchCachedLine = useCallback(
        async (lineId: number, changes: LineChanges) => {
            setCachedLines(lines =>
                lines.map(line =>
                    line.id === lineId ? { ...line, ...changes } : line,
                ),
            );
            try {
                replaceCachedLine(await patchLine({ ...changes, id: lineId }));
            } catch (error) {
                refetchLines();
                throw error;
            }
        },
        [patchLine, refetchLines, replaceCachedLine, setCachedLines],
    );

    // The error snackbar is shown by the mutation; the cache is rolled back.
    const updateLine = useCallback(
        (lineId: number, changes: LineChanges) =>
            patchCachedLine(lineId, changes).catch(() => undefined),
        [patchCachedLine],
    );

    const saveLine = useCallback(
        async (line: InterventionCostBreakdownLinePayload) => {
            if (line.id !== undefined) {
                await patchCachedLine(line.id, line);
                return;
            }
            const created = await createLine(line);
            setCachedLines(lines => [...lines, created]);
        },
        [createLine, patchCachedLine, setCachedLines],
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
