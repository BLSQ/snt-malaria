import React, { FC, useMemo } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { usePreviewYearSelection } from '../hooks/usePreviewYearSelection';
import { MESSAGES } from '../messages';
import { CompositePreviewState } from '../types/compositeLayer';
import { CollapsibleMapPreview } from './CollapsibleMapPreview';

type Props = {
    preview?: CompositePreviewState;
    orgUnits: OrgUnit[];
    /** Recomputes Flume's connection curves; called while the node resizes. */
    onResize?: () => void;
    /** Persisted initial expanded state (restored when the editor reopens). */
    defaultExpanded?: boolean;
    /** Called when the user toggles the preview, so the state can be persisted. */
    onExpandedChange?: (expanded: boolean) => void;
};

type FormatMessage = ReturnType<typeof useSafeIntl>['formatMessage'];

const statusMessageFor = (
    preview: CompositePreviewState | undefined,
    formatMessage: FormatMessage,
): string | undefined => {
    // Keep the last rendered map visible while a new evaluation is in flight or after a transient
    // error, so the preview doesn't flicker to a placeholder on every edit.
    const hasMap = !!preview?.data?.metric_values?.length;
    if (hasMap) {
        return undefined;
    }
    if (!preview || preview.status === 'idle' || preview.status === 'loading') {
        return formatMessage(MESSAGES.computingPreview);
    }
    if (preview.status === 'error') {
        return preview.error || formatMessage(MESSAGES.previewConnectOutput);
    }
    return formatMessage(MESSAGES.previewNoResults);
};

/**
 * Live preview map for the output node. Reads the debounced graph-evaluation result from the editor
 * context (see `CompositeEditorContext.preview`) — the graph is re-run on every change without being
 * persisted.
 */
export const CompositeOutputPreview: FC<Props> = ({
    preview,
    orgUnits,
    onResize,
    defaultExpanded = false,
    onExpandedChange,
}) => {
    const { formatMessage } = useSafeIntl();
    const data = preview?.data;

    // Years come straight from the backend (newest first); a timeless graph reports none.
    const years = useMemo(() => data?.years ?? [], [data?.years]);
    const { isMultiYear, selectedYear, setSelectedYear, displayedValues } =
        usePreviewYearSelection(years, data?.metric_values);

    return (
        <CollapsibleMapPreview
            label={formatMessage(MESSAGES.mapPreview)}
            orgUnits={orgUnits}
            defaultExpanded={defaultExpanded}
            onExpandedChange={onExpandedChange}
            metricValues={displayedValues}
            legendConfig={
                data
                    ? {
                          legend_type: data.legend_type,
                          legend_config: data.legend_config,
                          units: data.units,
                          unit_symbol: data.unit_symbol,
                      }
                    : undefined
            }
            statusMessage={statusMessageFor(preview, formatMessage)}
            onResize={onResize}
            yearOptions={isMultiYear ? years : undefined}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
        />
    );
};
