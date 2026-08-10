import { useMemo } from 'react';
import { usePlanningContext } from '../contexts/PlanningContext';
import { CATEGORY_COLORS } from '../libs/color-utils';
import { BudgetIntervention } from '../types/budget';

const UNCATEGORIZED_KEY = -1;

type InterventionCategoryColors = {
    // `interventions` sorted so that those sharing a category sit together
    // (groups ordered by total cost desc, interventions within a group too).
    orderedInterventions: BudgetIntervention[];
    // Stable base colour per intervention, assigned in the order categories
    // first appear in the (cost-sorted) intervention list.
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
    const categoryIdByInterventionId = useMemo(() => {
        const map = new Map<number, number>();
        interventionCategories.forEach(category => {
            category.interventions.forEach(intervention => {
                map.set(intervention.id, category.id);
            });
        });
        return map;
    }, [interventionCategories]);

    const orderedInterventions = useMemo(() => {
        const categoryOf = (intervention: BudgetIntervention) =>
            categoryIdByInterventionId.get(intervention.id) ??
            UNCATEGORIZED_KEY;

        const totalByCategory = new Map<number, number>();
        interventions.forEach(intervention => {
            const categoryId = categoryOf(intervention);
            totalByCategory.set(
                categoryId,
                (totalByCategory.get(categoryId) ?? 0) +
                    intervention.total_cost,
            );
        });

        return [...interventions].sort((a, b) => {
            const catA = categoryOf(a);
            const catB = categoryOf(b);
            if (catA !== catB) {
                return (
                    (totalByCategory.get(catB) ?? 0) -
                    (totalByCategory.get(catA) ?? 0)
                );
            }
            return b.total_cost - a.total_cost;
        });
    }, [interventions, categoryIdByInterventionId]);

    const colorByInterventionId = useMemo(() => {
        const colorByCategoryId = new Map<number, string>();
        const result = new Map<number, string>();
        let next = 0;
        orderedInterventions.forEach(intervention => {
            const categoryId =
                categoryIdByInterventionId.get(intervention.id) ??
                UNCATEGORIZED_KEY;
            if (!colorByCategoryId.has(categoryId)) {
                colorByCategoryId.set(
                    categoryId,
                    CATEGORY_COLORS[next % CATEGORY_COLORS.length],
                );
                next += 1;
            }
            result.set(
                intervention.id,
                colorByCategoryId.get(categoryId) ?? CATEGORY_COLORS[0],
            );
        });
        return result;
    }, [orderedInterventions, categoryIdByInterventionId]);

    return { orderedInterventions, colorByInterventionId };
};
