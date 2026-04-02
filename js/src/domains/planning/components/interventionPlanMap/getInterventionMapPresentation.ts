import { MetricType } from '../../types/metrics';
import { ScenarioRule } from '../../types/scenarioRule';
import { AssignmentDisplay } from './buildAssignmentDisplay';

/**
 * Derives SNT map props (legend, highlights, border tint, React key) from preview
 * mode, optional metric layer, and assignment-based legend data.
 *
 * How the map legend, highlights, and chrome behave depends on two axes:
 *
 * 1. Preview (scenario rule form open) vs saved assignments only.
 * 2. Metric layer selected vs assignment-based fill/legend only.
 *
 * - Preview + no metric layer: use assignment-derived legend data but hide the
 *   map legend chrome (hideLegend); do not pass matched org unit IDs as
 *   selection highlight (highlights would duplicate the fill semantics).
 * - Preview + metric layer: show metric legend; optional border color from the
 *   draft rule; pass matched org unit IDs for highlight when useful.
 * - Saved mode: assignment legend when no metric layer; usual highlights from parent.
 */
export function getInterventionMapPresentation({
    isPreviewingRule,
    activeMetricLayer,
    previewRule,
    matchedOrgUnitIds,
    assignmentLegend,
}: {
    isPreviewingRule: boolean;
    activeMetricLayer: MetricType | undefined;
    previewRule?: Partial<ScenarioRule>;
    matchedOrgUnitIds?: number[];
    assignmentLegend: AssignmentDisplay['legend'];
}) {
    const hideLegend = isPreviewingRule && !activeMetricLayer;
    const legendConfig = activeMetricLayer ?? assignmentLegend;
    const selectedBorderColor = activeMetricLayer
        ? previewRule?.color
        : undefined;
    const highlightedOrgUnitIds =
        isPreviewingRule && !activeMetricLayer ? undefined : matchedOrgUnitIds;
    const mapDataKey = previewRule?.color;

    return {
        hideLegend,
        legendConfig,
        selectedBorderColor,
        highlightedOrgUnitIds,
        mapDataKey,
    };
}
