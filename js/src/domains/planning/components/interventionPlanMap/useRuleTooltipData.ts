import { useCallback, useMemo } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { mapValues, uniq } from 'lodash';
import { useFormatMetricValue } from '../../../../hooks/useFormatMetricValue';
import { useGetMetricValuesByMetricType } from '../../../dataLayers/hooks/useGetMetrics';
import { MetricType } from '../../../dataLayers/types/metrics';
import { getDataLayerYear } from '../../../scenarios/types';
import {
    indexMetricValuesByOrgUnit,
    toOrgUnitMetric,
} from '../../libs/map-utils';
import { parseOrgUnitIds } from '../../libs/rule-utils';
import { ScenarioRule } from '../../types/scenarioRule';
import { getOperatorSymbol } from '../scenarioRule/scenarioRuleForm/CriterionOperatorSelect';
import { CriterionCheck } from './RuleSelectionTooltipBody';

type Args = {
    previewRule?: Partial<ScenarioRule>;
    matchedOrgUnitIds?: number[];
    matchedIdsByMetric?: Record<string, number[]>;
    metricTypes: MetricType[];
    dataLayerYears?: Record<string, number>;
};

export const useRuleTooltipData = ({
    previewRule,
    matchedOrgUnitIds,
    matchedIdsByMetric,
    metricTypes,
    dataLayerYears,
}: Args) => {
    const { formatMessage } = useSafeIntl();
    const formatMetricValue = useFormatMetricValue();
    const criteria = useMemo(
        () => previewRule?.matching_criteria ?? [],
        [previewRule?.matching_criteria],
    );

    const criteriaMetricTypes = useMemo(
        () =>
            uniq(criteria.map(criterion => criterion.metric_type))
                .map(id => metricTypes.find(metricType => metricType.id === id))
                .filter((metricType): metricType is MetricType =>
                    Boolean(metricType),
                ),
        [criteria, metricTypes],
    );
    const metricValuesParams = useMemo(
        () =>
            criteriaMetricTypes.map(({ id }) => ({
                metricTypeId: id,
                year: getDataLayerYear(dataLayerYears, id),
            })),
        [criteriaMetricTypes, dataLayerYears],
    );
    const valuesByMetricType =
        useGetMetricValuesByMetricType(metricValuesParams);
    const valueIndexByMetricType = useMemo(
        () => mapValues(valuesByMetricType, indexMetricValuesByOrgUnit),
        [valuesByMetricType],
    );

    const matchedIds = useMemo(
        () => new Set(matchedOrgUnitIds),
        [matchedOrgUnitIds],
    );
    const matchedIdSetsByMetric = useMemo(
        () => mapValues(matchedIdsByMetric, ids => new Set(ids)),
        [matchedIdsByMetric],
    );
    const includedIds = useMemo(
        () => new Set(parseOrgUnitIds(previewRule?.org_units_included)),
        [previewRule?.org_units_included],
    );
    const excludedIds = useMemo(
        () => new Set(parseOrgUnitIds(previewRule?.org_units_excluded)),
        [previewRule?.org_units_excluded],
    );

    const meetsMetricCriteria = useCallback(
        (metricTypeId: number, orgUnitId: number) =>
            matchedIdSetsByMetric[metricTypeId]?.has(orgUnitId),
        [matchedIdSetsByMetric],
    );

    const criterionTextByMetricType = useMemo(() => {
        const texts = new Map<number, string>();
        criteriaMetricTypes.forEach(metricType => {
            const parts = criteria
                .filter(
                    criterion =>
                        criterion.metric_type === metricType.id &&
                        (criterion.value != null ||
                            Boolean(criterion.string_value)),
                )
                .map(
                    criterion =>
                        `${getOperatorSymbol(criterion.operator)} ${
                            criterion.string_value ||
                            formatMetricValue(
                                criterion.value ?? '',
                                metricType.unit_symbol,
                            )
                        }`,
                );
            if (parts.length > 0) texts.set(metricType.id, parts.join(', '));
        });
        return texts;
    }, [criteria, criteriaMetricTypes, formatMetricValue]);

    const getRuleSelection = useCallback(
        (orgUnitId: number) => {
            const criteriaChecks: CriterionCheck[] = criteriaMetricTypes.map(
                metricType => {
                    const metric = toOrgUnitMetric(
                        valueIndexByMetricType[metricType.id]?.get(orgUnitId),
                        formatMessage,
                    );
                    return {
                        key: String(metricType.id),
                        label: metricType.name,
                        value: metric
                            ? formatMetricValue(
                                  metric.label,
                                  metricType.unit_symbol,
                              )
                            : undefined,
                        criterion: criterionTextByMetricType.get(metricType.id),
                        meets: meetsMetricCriteria(metricType.id, orgUnitId),
                    };
                },
            );
            let manualChange: 'added' | 'removed' | undefined;
            if (includedIds.has(orgUnitId)) manualChange = 'added';
            if (excludedIds.has(orgUnitId)) manualChange = 'removed';
            return {
                isIncluded: matchedIds.has(orgUnitId),
                criteria: criteriaChecks,
                manualChange,
            };
        },
        [
            criteriaMetricTypes,
            valueIndexByMetricType,
            formatMessage,
            formatMetricValue,
            criterionTextByMetricType,
            meetsMetricCriteria,
            includedIds,
            excludedIds,
            matchedIds,
        ],
    );

    const getCriterionMatch = useCallback(
        (metricType: MetricType, orgUnitId: number) => {
            if (!criteriaMetricTypes.some(({ id }) => id === metricType.id)) {
                return undefined;
            }
            return {
                criterion: criterionTextByMetricType.get(metricType.id),
                meets: meetsMetricCriteria(metricType.id, orgUnitId),
            };
        },
        [criteriaMetricTypes, criterionTextByMetricType, meetsMetricCriteria],
    );

    return { getRuleSelection, getCriterionMatch };
};
