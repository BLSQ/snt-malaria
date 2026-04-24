import { sortBy } from 'lodash';
import { InterventionCategory } from '../types/interventions';
import { InterventionProperties } from '../types/scenarioRule';

/**
 * Builds a deterministic rule name from the selected intervention properties.
 * Interventions are sorted alphabetically by category name first, then by
 * intervention name - identical to the backend's `_build_rule_name`. Each
 * intervention is rendered using its `short_name`, falling back to `name`,
 * also matching the backend's label resolution. Returns an empty string when
 * no intervention can be resolved.
 */
export const generateRuleName = (
    interventionProperties: InterventionProperties[],
    interventionCategories: InterventionCategory[],
): string => {
    const pairs = interventionProperties.flatMap(property => {
        const category = interventionCategories.find(
            candidate => candidate.id === property.category,
        );
        const intervention = category?.interventions.find(
            candidate => candidate.id === property.intervention,
        );
        return category && intervention ? [{ category, intervention }] : [];
    });
    return sortBy(pairs, ['category.name', 'intervention.name'])
        .map(({ intervention }) => intervention.short_name || intervention.name)
        .join(' + ');
};
