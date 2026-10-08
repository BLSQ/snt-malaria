import { sortBy } from 'lodash';
import { InterventionCategory } from '../../interventions/types';

export const findInterventionWithCategory = (
    interventionCategories: InterventionCategory[],
    interventionId: number,
) => {
    const category = interventionCategories.find(c =>
        c.interventions.some(i => i.id === interventionId),
    );
    const intervention = category?.interventions.find(
        i => i.id === interventionId,
    );
    return category && intervention ? { category, intervention } : undefined;
};

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
    const pairs = interventionIds.flatMap(id => {
        const match = findInterventionWithCategory(interventionCategories, id);
        return match ? [match] : [];
    });
    return sortBy(pairs, ['category.name', 'intervention.name'])
        .map(({ intervention }) => intervention.short_name || intervention.name)
        .join(' + ');
};

export const parseOrgUnitIds = (commaSeparatedIds?: string): number[] =>
    (commaSeparatedIds || '')
        .split(',')
        .filter(id => id !== '')
        .map(id => parseInt(id, 10))
        .filter(id => Number.isFinite(id));

/** Mirrors the backend's `ScenarioRule.resolve_org_unit_ids` set algebra. */
export const resolveRuleOrgUnitIds = ({
    hasCriteria,
    ruleMatchedIds,
    excludedIds,
    includedIds,
}: {
    hasCriteria: boolean;
    ruleMatchedIds: number[];
    excludedIds: number[];
    includedIds: number[];
}): number[] => {
    if (!hasCriteria) {
        return includedIds;
    }
    const excluded = new Set(excludedIds);
    const resolved = new Set(ruleMatchedIds.filter(id => !excluded.has(id)));
    includedIds.forEach(id => resolved.add(id));
    return [...resolved];
};
