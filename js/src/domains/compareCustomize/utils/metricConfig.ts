import { useMemo } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import type { IntlMessage } from 'bluesquare-components/dist/types/types/types';
import type { FormatNumberOptions } from 'react-intl';
import { MESSAGES } from '../../messages';
import { MetricKey } from '../types';

/**
 * Display config for one metric: a localized label, number-formatting
 * options, and the semantic direction of positive values.
 *
 * `format` is `react-intl`'s `FormatNumberOptions`, which is the same
 * shape as `Intl.NumberFormatOptions` (minus `localeMatcher`) — accepts
 * the standard Intl options like `notation: 'compact'`, `style: 'percent'`,
 * `style: 'currency'`, `maximumFractionDigits`, etc.
 *
 * Labels are resolved strings, not message keys, so consumers never need
 * to reach into `MESSAGES`. Use {@link useMetricConfig} to obtain the
 * resolved record.
 */
export type MetricConfig = {
    label: string;
    format: FormatNumberOptions;
    /** When true, a positive value/delta is favorable; otherwise it is unfavorable. */
    positiveIsGreen: boolean;
};

/**
 * Internal table holding the unresolved label message for each metric.
 * Declaration order is preserved by `useMetricConfig`'s output (ES2015
 * guarantees insertion order for non-numeric string keys, and all
 * `MetricKey` values are non-numeric strings), so consumers can rely on
 * it for ordering and default-pick semantics.
 */
const METRIC_CONFIG: Record<
    MetricKey,
    {
        label: IntlMessage;
        format: FormatNumberOptions;
        positiveIsGreen: boolean;
    }
> = {
    [MetricKey.DirectDeaths]: {
        label: MESSAGES.deaths,
        format: { notation: 'compact', maximumFractionDigits: 1 },
        positiveIsGreen: false,
    },
    [MetricKey.Cases]: {
        label: MESSAGES.impactCases,
        format: { notation: 'compact', maximumFractionDigits: 1 },
        positiveIsGreen: false,
    },
    [MetricKey.SevereCases]: {
        label: MESSAGES.impactSevereCases,
        format: { notation: 'compact', maximumFractionDigits: 1 },
        positiveIsGreen: false,
    },
    [MetricKey.PrevalenceRate]: {
        label: MESSAGES.impactDifferenceMetricPrevalenceRate,
        format: { style: 'percent', maximumFractionDigits: 2 },
        positiveIsGreen: false,
    },
    [MetricKey.OrgUnitTotalCost]: {
        label: MESSAGES.impactDifferenceMetricOrgUnitCost,
        format: { notation: 'compact', maximumFractionDigits: 1 },
        positiveIsGreen: false,
    },
};

/**
 * Returns the metric config record with labels resolved against the
 * active locale. Memoized on `formatMessage` so it only recomputes on
 * locale change.
 */
export const useMetricConfig = (): Record<MetricKey, MetricConfig> => {
    const { formatMessage } = useSafeIntl();
    return useMemo(
        () =>
            Object.fromEntries(
                (Object.keys(METRIC_CONFIG) as MetricKey[]).map(k => [
                    k,
                    {
                        ...METRIC_CONFIG[k],
                        label: formatMessage(METRIC_CONFIG[k].label),
                    },
                ]),
            ) as Record<MetricKey, MetricConfig>,
        [formatMessage],
    );
};
