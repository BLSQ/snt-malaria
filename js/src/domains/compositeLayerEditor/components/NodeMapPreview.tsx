import React, { FC, useMemo, useState } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { useGetMetricValues } from '../../dataLayers/hooks/useGetMetrics';
import { MetricType, MetricValue } from '../../dataLayers/types/metrics';
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
    /** When set, mirrors the node's pinned output: forces this single year, hides the picker. */
    pinnedYear?: number;
};

/** What `CollapsibleMapPreview` needs to show either a fixed pinned year or a browsable one. */
type YearPicker = {
    values?: MetricValue[];
    yearOptions?: number[];
    selectedYear?: number;
    onYearChange?: (year: number) => void;
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
    pinnedYear,
}) => {
    const { formatMessage } = useSafeIntl();
    const [expanded, setExpanded] = useState(initialExpanded);

    const isPinned = pinnedYear != null;

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
        usePreviewYearSelection(isPinned ? [] : years, metricValues);

    // A pinned node has nothing to browse: show only its pinned year, no picker. Otherwise let the
    // preview browse whichever years are actually available.
    const yearPicker: YearPicker = isPinned
        ? { values: (metricValues ?? []).filter(value => value.year === pinnedYear) }
        : {
              values: displayedValues,
              yearOptions: isMultiYear ? years : undefined,
              selectedYear,
              onYearChange: setSelectedYear,
          };

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
            metricValues={yearPicker.values}
            legendConfig={metricType}
            defaultExpanded={initialExpanded}
            onExpandedChange={handleExpandedChange}
            onResize={onResize}
            yearOptions={yearPicker.yearOptions}
            selectedYear={yearPicker.selectedYear}
            onYearChange={yearPicker.onYearChange}
        />
    );
};
