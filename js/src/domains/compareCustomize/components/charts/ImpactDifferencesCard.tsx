import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../../../messages';
import { useComparisonDataContext } from '../../ComparisonDataContext';
import { MetricKey } from '../../types';
import { useMetricConfig } from '../../utils/metricConfig';
import { getAvailableMetrics } from '../../utils/divergingScale';
import { Card } from '../Card';
import { ImpactDifferencesMap } from '../maps/ImpactDifferencesMap';
import { ChartEmptyState } from './ChartEmptyState';

const IMPACT_DIFFERENCE_METRIC_KEY = 'impact_difference_metric';

export const ImpactDifferencesCard: FC = () => {
    const {
        scenarios,
        impactsByScenarioId,
        budgetsByScenarioId,
        isImpactLoading,
        isBudgetLoading,
    } = useComparisonDataContext();
    const { formatMessage } = useSafeIntl();
    const config = useMetricConfig();

    // First key in declaration order is the default. useState's lazy initializer
    // runs once on mount, so this is unaffected by later locale changes.
    const [selectedMetric, setSelectedMetric] = useState<MetricKey>(
        () => Object.keys(config)[0] as MetricKey,
    );

    const availableMetrics = useMemo(
        () => getAvailableMetrics(impactsByScenarioId, budgetsByScenarioId),
        [impactsByScenarioId, budgetsByScenarioId],
    );

    const metricOptions = useMemo(() => {
        const allOptions = (Object.keys(config) as MetricKey[]).map(key => ({
            label: config[key].label,
            value: key,
        }));
        // Keep all options visible until data has loaded so the dropdown isn't briefly empty.
        if (availableMetrics.size === 0) return allOptions;
        return allOptions.filter(option => availableMetrics.has(option.value));
    }, [config, availableMetrics]);

    useEffect(() => {
        if (availableMetrics.size === 0) return;
        if (availableMetrics.has(selectedMetric)) return;
        const fallback = metricOptions[0]?.value;
        if (fallback && fallback !== selectedMetric) {
            setSelectedMetric(fallback);
        }
    }, [availableMetrics, selectedMetric, metricOptions]);

    const handleMetricChange = useCallback(
        (_key: string, value: unknown) => {
            setSelectedMetric(value as MetricKey);
        },
        [],
    );

    const isLoading = useMemo(
        () =>
            isImpactLoading ||
            (selectedMetric === MetricKey.OrgUnitTotalCost && isBudgetLoading),
        [isImpactLoading, isBudgetLoading, selectedMetric],
    );

    const hasComparison = scenarios.length >= 2;

    const metricDropdown = (
        <InputComponent
            keyValue={IMPACT_DIFFERENCE_METRIC_KEY}
            type="select"
            labelString={formatMessage(MESSAGES.impactDifferenceMetricLabel)}
            value={selectedMetric}
            options={metricOptions}
            clearable={false}
            onChange={handleMetricChange}
            disabled={!hasComparison}
            withMarginTop={false}
            wrapperSx={{
                flexShrink: 0,
                width: 'auto',
                minWidth: '20ch',
                maxWidth: '100%',
            }}
        />
    );

    return (
        <Card
            title={formatMessage(MESSAGES.impactDifferencesTitle)}
            icon={MapOutlinedIcon}
            bodySx={{
                minHeight: 260,
                display: 'flex',
                flexDirection: 'column',
            }}
            actions={metricDropdown}
            isLoading={isLoading}
        >
            {hasComparison ? (
                <ImpactDifferencesMap selectedMetric={selectedMetric} />
            ) : (
                <ChartEmptyState
                    message={formatMessage(
                        MESSAGES.impactDifferencesSelectComparison,
                    )}
                />
            )}
        </Card>
    );
};
