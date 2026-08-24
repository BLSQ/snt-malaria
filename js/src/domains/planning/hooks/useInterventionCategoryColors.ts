import { useMemo } from 'react';
import { InterventionCategory } from '../../interventions/types';
import { usePlanningContext } from '../contexts/PlanningContext';
import { CATEGORY_COLORS } from '../libs/color-utils';
import { sortByStringProp } from '../libs/list-utils';
import { BudgetIntervention } from '../types/budget';

// Exported so other places that need the same category grouping (e.g. the
// comparison tab's shared row order across slots) can reuse it instead of
// falling back to an ungrouped order.
export const UNCATEGORIZED_KEY = -1;

export const buildCategoryIdByInterventionId = (
    interventionCategories: InterventionCategory[],
): Map<number, number> => {
    const map = new Map<number, number>();
    interventionCategories.forEach(category => {
        category.interventions.forEach(intervention => {
            map.set(intervention.id, category.id);
        });
    });
    return map;
};

/**
 * Orders `items` so that those sharing a category sit together (largest-cost
 * category first, largest item within a category first).
 */
export const orderByCategoryCost = <T>(
    items: T[],
    categoryIdOf: (item: T) => number,
    costOf: (item: T) => number,
): T[] => {
    const totalByCategory = new Map<number, number>();
    items.forEach(item => {
        const categoryId = categoryIdOf(item);
        totalByCategory.set(
            categoryId,
            (totalByCategory.get(categoryId) ?? 0) + costOf(item),
        );
    });

    return [...items].sort((a, b) => {
        const catA = categoryIdOf(a);
        const catB = categoryIdOf(b);
        if (catA !== catB) {
            return (
                (totalByCategory.get(catB) ?? 0) -
                (totalByCategory.get(catA) ?? 0)
            );
        }
        return costOf(b) - costOf(a);
    });
};

/**
 * Assigns each intervention category a stable colour from `CATEGORY_COLORS`,
 * keyed by category id. Categories are sorted by name first so the colour
 * depends only on the category's own identity, not on the cost ranking of
 * whichever interventions happen to be passed to the hook -- otherwise the
 * same category could get a different colour per slot/year/budget depending
 * on where it lands in that particular cost sort.
 */
const buildColorByCategoryId = (
    interventionCategories: InterventionCategory[],
): Map<number, string> => {
    const sortedCategories = sortByStringProp(interventionCategories, 'name');
    const colorByCategoryId = new Map<number, string>();
    sortedCategories.forEach((category, index) => {
        colorByCategoryId.set(
            category.id,
            CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        );
    });
    return colorByCategoryId;
};

export type InterventionCategoryColors = {
    // `interventions` sorted so that those sharing a category sit together
    // (groups ordered by total cost desc, interventions within a group too).
    orderedInterventions: BudgetIntervention[];
    // Stable base colour per intervention, derived from its category's own
    // identity (see `buildColorByCategoryId`).
    colorByInterventionId: Map<number, string>;
};

/**
 * Orders interventions by category (largest-cost category first, largest
 * intervention within a category first) and assigns each intervention its
 * category's base colour, so any chart plotting interventions can share the
 * same visual grouping (e.g. `CostPerInterventionSummary`'s bars and
 * `CostVsPopulationSummary`'s dots use the same colour per intervention).
 */
export const useInterventionCategoryColors = (
    interventions: BudgetIntervention[],
): InterventionCategoryColors => {
    const { interventionCategories } = usePlanningContext();

    // Intervention id -> its intervention category id.
    const categoryIdByInterventionId = useMemo(
        () => buildCategoryIdByInterventionId(interventionCategories),
        [interventionCategories],
    );

    const orderedInterventions = useMemo(
        () =>
            orderByCategoryCost(
                interventions,
                intervention =>
                    categoryIdByInterventionId.get(intervention.id) ??
                    UNCATEGORIZED_KEY,
                intervention => intervention.total_cost,
            ),
        [interventions, categoryIdByInterventionId],
    );

    const colorByCategoryId = useMemo(
        () => buildColorByCategoryId(interventionCategories),
        [interventionCategories],
    );

    const colorByInterventionId = useMemo(() => {
        const result = new Map<number, string>();
        orderedInterventions.forEach(intervention => {
            const categoryId =
                categoryIdByInterventionId.get(intervention.id) ??
                UNCATEGORIZED_KEY;
            result.set(
                intervention.id,
                colorByCategoryId.get(categoryId) ?? CATEGORY_COLORS[0],
            );
        });
        return result;
    }, [orderedInterventions, categoryIdByInterventionId, colorByCategoryId]);

    return { orderedInterventions, colorByInterventionId };
};
