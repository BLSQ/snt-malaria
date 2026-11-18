import { MetricTypeCriterion } from '../types/scenarioRule';

export const upsertCriterion = (
    criteria: MetricTypeCriterion[],
    criterion: MetricTypeCriterion,
): MetricTypeCriterion[] => {
    const index = criteria.findIndex(
        existing => existing.metric_type === criterion.metric_type,
    );
    if (index === -1) {
        return [...criteria, criterion];
    }
    return criteria.map((existing, i) => (i === index ? criterion : existing));
};
