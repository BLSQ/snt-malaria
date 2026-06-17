import { sortBy } from 'lodash';
import { InterventionCategory } from '../../interventions/types';

/**
 * Builds a deterministic rule name from the selected intervention IDs.
 * Interventions are sorted alphabetically by category name first, then by
 * intervention name. Each intervention is rendered using its `short_name`,
 * falling back to `name`. Returns an empty string when no intervention can
 * be resolved.
 */
export const generateRuleName = (
    interventionIds: number[],
    interventionCategories: InterventionCategory[],
): string => {
    const allInterventions = interventionCategories.flatMap(
        c => c.interventions,
    );
    const pairs = interventionIds.flatMap(id => {
        const intervention = allInterventions.find(i => i.id === id);
        if (!intervention) return [];
        const category = interventionCategories.find(c =>
            c.interventions.some(i => i.id === id),
        );
        return category ? [{ category, intervention }] : [];
    });
    return sortBy(pairs, ['category.name', 'intervention.name'])
        .map(({ intervention }) => intervention.short_name || intervention.name)
        .join(' + ');
};
