import { MetricType } from '../../../dataLayers/types/metrics';
import { ScenarioRule } from '../../types/scenarioRule';
import { AssignmentDisplay } from './buildAssignmentDisplay';

/**
 * Derives SNT map props (legend, highlights, React key) from preview mode,
 * optional metric layer, and assignment-based legend data.
 *
 * How the map legend and highlights behave depends on two axes:
 *
 * 1. Preview (scenario rule form open) vs saved assignments only.
 * 2. Metric layer selected vs assignment-based fill/legend only.
 *
 * - Preview + no metric layer: use assignment-derived legend data but hide the
 *   map legend chrome (hideLegend); no highlight, the fill already shows the
 *   rule's matches.
 * - Preview + metric layer: show metric legend; highlight
 *   `mapHighlightedOrgUnitIds`.
 * - Saved mode: assignment legend when no metric layer; no highlight.
 */
export function getInterventionMapPresentation({
    isPreviewingRule,
    activeMetricLayer,
    previewRule,
    mapHighlightedOrgUnitIds,
    assignmentLegend,
}: {
    isPreviewingRule: boolean;
    activeMetricLayer: MetricType | undefined;
    previewRule?: Partial<ScenarioRule>;
    mapHighlightedOrgUnitIds?: number[];
    assignmentLegend: AssignmentDisplay['legend'];
}) {
    const hideLegend = isPreviewingRule && !activeMetricLayer;
    const legendConfig = activeMetricLayer ?? assignmentLegend;
    const highlightedOrgUnitIds =
        isPreviewingRule && activeMetricLayer
            ? mapHighlightedOrgUnitIds
            : undefined;
    const mapDataKey = previewRule?.color;

    return {
        hideLegend,
        legendConfig,
        highlightedOrgUnitIds,
        mapDataKey,
    };
}
