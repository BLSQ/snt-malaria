import React, { FC, useMemo } from 'react';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import { useSafeIntl } from 'bluesquare-components';
import { ChartEmptyState } from '../../../../components/charts/ChartEmptyState';
import { WidgetCard } from '../../../../components/WidgetCard';
import { MESSAGES } from '../../../messages';
import { useComparisonDataContext } from '../../ComparisonDataContext';
import { useMetricSelection } from '../../hooks/useMetricSelection';
import { MetricKey } from '../../types';
import { ImpactDifferencesMap } from '../maps/ImpactDifferencesMap';

export const ImpactDifferencesCard: FC = () => {
    const { scenarios, isImpactLoading, isBudgetLoading } =
        useComparisonDataContext();
    const { formatMessage } = useSafeIntl();
    const { selectedMetric, setSelectedMetric, metricOptions } =
        useMetricSelection();

    const isLoading = useMemo(
        () =>
            isImpactLoading ||
            (selectedMetric === MetricKey.OrgUnitTotalCost && isBudgetLoading),
        [isImpactLoading, isBudgetLoading, selectedMetric],
    );

    const hasComparison = scenarios.length >= 2;

    return (
        <WidgetCard
            title={formatMessage(MESSAGES.impactDifferencesTitle)}
            icon={MapOutlinedIcon}
            bodySx={{
                minHeight: 260,
                display: 'flex',
                flexDirection: 'column',
            }}
            dropdown={{
                value: selectedMetric,
                options: metricOptions,
                onChange: setSelectedMetric,
                disabled: !hasComparison,
            }}
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
        </WidgetCard>
    );
};
