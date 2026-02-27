import { ScenarioRuleResponse } from '../hooks/useGetScenarioRules';
import { ScenarioRule } from '../types/scenarioRule';
import { jsonLogicToMatchingCriteria } from './jsonLogic';

export const mapResponseToScenarioRule = (
    response: ScenarioRuleResponse,
): ScenarioRule => {
    return {
        id: response.id,
        name: response.name,
        scenario: response.scenario,
        priority: response.priority,
        color: response.color,
        matching_criteria: jsonLogicToMatchingCriteria(
            response.matching_criteria,
        ),
        intervention_properties: response.intervention_properties,
        org_units_excluded:
            response.org_units_excluded &&
            response.org_units_excluded.join(','),
        org_units_included:
            response.org_units_included &&
            response.org_units_included.join(','),
    };
};

export const mapResponseToScenarioRules = (
    responses: ScenarioRuleResponse[],
): ScenarioRule[] => {
    const criteria: ScenarioRule[] = [];
    responses.forEach(response => {
        criteria.push({
            ...mapResponseToScenarioRule(response),
        });
    });
    return criteria;
};
