import { mapValues } from 'lodash';
import {
    ScenarioRulePreviewRequest,
    ScenarioRulePreviewResult,
    usePreviewScenarioRule,
} from '../../hooks/usePreviewScenarioRule';
import { MetricTypeCriterion } from '../../types/scenarioRule';
import { matchingCriteriaToJsonLogic } from '../../utils/jsonLogic';
import {
    EQUAL_OPERATOR,
    Operator,
} from '../scenarioRule/scenarioRuleForm/CriterionOperatorSelect';

export const THRESHOLD_OPERATORS: Operator[] = ['>=', '<=', '>', '<', '=='];

const NO_RULES: ScenarioRulePreviewRequest = {};

const buildPreviewRules = (
    metricTypeId: number,
    criteriaByKey: Record<string, Omit<MetricTypeCriterion, 'metric_type'>>,
): ScenarioRulePreviewRequest =>
    mapValues(criteriaByKey, criterion =>
        matchingCriteriaToJsonLogic([
            { ...criterion, metric_type: metricTypeId },
        ]),
    ) as ScenarioRulePreviewRequest;

export const buildOperatorPreviewRules = (
    metricTypeId: number,
    value: number,
): ScenarioRulePreviewRequest =>
    buildPreviewRules(
        metricTypeId,
        Object.fromEntries(
            THRESHOLD_OPERATORS.map(operator => [
                operator,
                { operator, value },
            ]),
        ),
    );

export const buildValuePreviewRules = (
    metricTypeId: number,
    values: string[],
): ScenarioRulePreviewRequest =>
    buildPreviewRules(
        metricTypeId,
        Object.fromEntries(
            values.map(value => [
                value,
                { operator: EQUAL_OPERATOR, string_value: value },
            ]),
        ),
    );

/** The org units each of `rules` would match, as the metric's only criterion. */
export const useCriterionPreview = (
    rules: ScenarioRulePreviewRequest,
    dataLayerYears: Record<string, number> | undefined,
    enabled: boolean,
): ScenarioRulePreviewResult | undefined => {
    const { data, isPreviousData } = usePreviewScenarioRule(
        enabled ? rules : NO_RULES,
        dataLayerYears,
    );
    return enabled && !isPreviousData ? data : undefined;
};
