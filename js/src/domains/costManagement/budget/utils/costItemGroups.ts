import {
    InterventionCategory,
    InterventionCostBreakdownLine,
} from '../../../interventions/types';
import { CostItemFilters, CostItemGroup } from '../types';

export const buildCostItemGroups = (
    interventionCategories: InterventionCategory[],
    costLines: InterventionCostBreakdownLine[],
): CostItemGroup[] => {
    const linesByIntervention = new Map<
        number,
        InterventionCostBreakdownLine[]
    >();
    costLines.forEach(line => {
        const lines = linesByIntervention.get(line.intervention) ?? [];
        lines.push(line);
        linesByIntervention.set(line.intervention, lines);
    });
    return interventionCategories.flatMap(interventionCategory =>
        interventionCategory.interventions.map(intervention => {
            const lines = linesByIntervention.get(intervention.id) ?? [];
            return {
                intervention,
                interventionCategory,
                lines,
                visibleLines: lines,
            };
        }),
    );
};

const includesQuery = (value: string | undefined, query: string) =>
    (value ?? '').toLowerCase().includes(query);

export const filterCostItemGroups = (
    groups: CostItemGroup[],
    { search, interventionCategoryId }: CostItemFilters,
): CostItemGroup[] => {
    const query = search.trim().toLowerCase();
    return groups
        .filter(
            group =>
                interventionCategoryId === null ||
                group.interventionCategory.id === interventionCategoryId,
        )
        .flatMap(group => {
            if (!query || includesQuery(group.intervention.name, query)) {
                return [group];
            }
            const visibleLines = group.lines.filter(
                line =>
                    includesQuery(line.name, query) ||
                    includesQuery(line.category_label, query),
            );
            return visibleLines.length > 0 ? [{ ...group, visibleLines }] : [];
        });
};
