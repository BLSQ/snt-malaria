import React, { FC, useMemo, useState } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { useGetMetricValues } from '../../dataLayers/hooks/useGetMetrics';
import { MetricType } from '../../dataLayers/types/metrics';
import { usePreviewYearSelection } from '../hooks/usePreviewYearSelection';
import { MESSAGES } from '../messages';
import { CollapsibleMapPreview } from './CollapsibleMapPreview';

type Props = {
    metricTypeId?: number;
    metricType?: MetricType;
    orgUnits: OrgUnit[];
    /** Recomputes Flume's connection curves; called while the node resizes. */
    onResize?: () => void;
    /** Persisted initial expanded state (restored when the editor reopens). */
    expanded?: boolean;
    /** Called when the user toggles the preview, so the state can be persisted. */
    onExpandedChange?: (expanded: boolean) => void;
};

/**
 * Collapsible preview map for a data layer node. Values are only fetched while the preview is
 * expanded, so collapsed nodes stay cheap. The expanded state is lifted to the caller so it can be
 * persisted in the graph and restored on reopen.
 */
export const NodeMapPreview: FC<Props> = ({
    metricTypeId,
    metricType,
    orgUnits,
    onResize,
    expanded: initialExpanded = false,
    onExpandedChange,
}) => {
    const { formatMessage } = useSafeIntl();
    const [expanded, setExpanded] = useState(initialExpanded);

    const { data: metricValues } = useGetMetricValues({
        metricTypeId: expanded && metricTypeId ? metricTypeId : null,
    });

    const years = useMemo(() => {
        const distinct = new Set<number>();
        (metricValues ?? []).forEach(value => {
            if (value.year != null) distinct.add(value.year);
        });
        return [...distinct].sort((a, b) => b - a);
    }, [metricValues]);
    const { isMultiYear, selectedYear, setSelectedYear, displayedValues } =
        usePreviewYearSelection(years, metricValues);

    const handleExpandedChange = (next: boolean) => {
        setExpanded(next);
        onExpandedChange?.(next);
    };

    return (
        <CollapsibleMapPreview
            label={formatMessage(MESSAGES.mapPreview)}
            disabled={!metricTypeId}
            disabledLabel={formatMessage(MESSAGES.selectLayerToPreview)}
            orgUnits={orgUnits}
            metricValues={displayedValues}
            legendConfig={metricType}
            defaultExpanded={initialExpanded}
            onExpandedChange={handleExpandedChange}
            onResize={onResize}
            yearOptions={isMultiYear ? years : undefined}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
        />
    );
};
