import { useCallback } from 'react';
import { useQueryClient } from 'react-query';
import { COST_BREAKDOWN_LINES_QUERY_KEY } from '../../../interventions/hooks/useGetCostBreakdownLines';
import { useSaveInterventionDetails } from '../../../interventions/hooks/useSaveInterventionDetails';
import {
    InterventionCostBreakdownLine,
    InterventionCostBreakdownLinePayload,
    InterventionDetails,
} from '../../../interventions/types';
import { CostItemGroup } from '../types';

const COST_LINES_QUERY_KEY = ['costBreakdownLines'];

const INVALIDATED_QUERY_KEYS = ['interventionDetails', 'calculated_budget'];

const replaceInterventionLines = (
    previous: InterventionCostBreakdownLine[] | undefined,
    interventionId: number,
    lines: InterventionCostBreakdownLine[],
) => [
    ...(previous ?? []).filter(line => line.intervention !== interventionId),
    // The details endpoint doesn't order lines; keep the list endpoint's id order.
    ...[...lines].sort((a, b) => a.id - b.id),
];

// Lines without an id (new ones) only reach the cache with the response.
const mergeSavedLines = (
    previous: InterventionCostBreakdownLine[] | undefined,
    interventionId: number,
    savedLines: InterventionCostBreakdownLinePayload[],
) => {
    const savedLinesById = new Map(
        savedLines
            .filter(line => line.id !== undefined)
            .map(line => [line.id, line]),
    );
    return (previous ?? [])
        .filter(
            line =>
                line.intervention !== interventionId ||
                savedLinesById.has(line.id),
        )
        .map(line => ({ ...line, ...savedLinesById.get(line.id) }));
};

export const useSaveCostItems = () => {
    const queryClient = useQueryClient();
    const { mutateAsync: saveInterventionDetails } = useSaveInterventionDetails(
        INVALIDATED_QUERY_KEYS,
    );

    // The cache is updated before the request so a second inline edit made
    // before the response lands is saved on top of the first one, not over it.
    const saveLines = useCallback(
        async (
            group: CostItemGroup,
            lines: InterventionCostBreakdownLinePayload[],
        ) => {
            const interventionId = group.intervention.id;
            queryClient.setQueryData<InterventionCostBreakdownLine[]>(
                COST_BREAKDOWN_LINES_QUERY_KEY,
                previous => mergeSavedLines(previous, interventionId, lines),
            );
            try {
                const saved = (await saveInterventionDetails({
                    interventionId,
                    cost_breakdown_lines: lines,
                })) as InterventionDetails;
                queryClient.setQueryData<InterventionCostBreakdownLine[]>(
                    COST_BREAKDOWN_LINES_QUERY_KEY,
                    previous =>
                        replaceInterventionLines(
                            previous,
                            interventionId,
                            saved.cost_breakdown_lines,
                        ),
                );
            } catch (error) {
                queryClient.invalidateQueries(COST_BREAKDOWN_LINES_QUERY_KEY);
                throw error;
            }
        },
        [queryClient, saveInterventionDetails],
    );

    const saveLine = useCallback(
        (
            group: CostItemGroup,
            savedLine: InterventionCostBreakdownLinePayload,
        ) =>
            saveLines(
                group,
                savedLine.id === undefined
                    ? [...group.lines, savedLine]
                    : group.lines.map(line =>
                          line.id === savedLine.id ? savedLine : line,
                      ),
            ),
        [saveLines],
    );

    const deleteLine = useCallback(
        (group: CostItemGroup, lineId: number) =>
            saveLines(
                group,
                group.lines.filter(line => line.id !== lineId),
            ),
        [saveLines],
    );

    return { saveLine, deleteLine };
};
