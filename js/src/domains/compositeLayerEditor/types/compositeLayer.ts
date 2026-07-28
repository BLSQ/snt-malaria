import { FlumeCommentMap } from 'flume';
import { MetricType, MetricValue } from '../../dataLayers/types/metrics';
import { FlumeGraph } from './flumeGraph';

export type CompositeLayer = {
    id: number;
    name: string;
    graph: FlumeGraph;
    /** Flume canvas comments (annotations), persisted alongside the graph. */
    comments: FlumeCommentMap;
    metric_type: number | null;
    /** Full resulting layer, returned on save so it can be shown on the map immediately. */
    metric_type_detail: MetricType | null;
    created_at: string;
    updated_at: string;
};

export type CompositeLayerListItem = Pick<
    CompositeLayer,
    'id' | 'name' | 'metric_type' | 'created_at' | 'updated_at'
>;

export type SaveCompositeLayerPayload = {
    graph: FlumeGraph;
    /**
     * Canvas annotations. Sent by the node editor; omitted by the dialogue (which edits only
     * metadata + legend) so a partial update preserves the existing comments.
     */
    comments?: FlumeCommentMap;
    /** When provided, updates (re-runs) the existing composite layer instead of creating one. */
    id?: number;
    /**
     * Layer metadata owned by the creation/edit dialogue (not the graph). Sent on create and when
     * the dialogue edits an existing composite; omitted on a graph-only save from the node editor
     * so the backend preserves the current values.
     */
    name?: string;
    category?: string;
    description?: string;
    units?: string;
    unit_symbol?: string;
    is_population?: boolean;
};

/**
 * Metadata collected in the create dialogue for a brand-new composite, carried into the editor
 * (which has no persisted layer yet) and included in the first save.
 */
export type CompositeDraft = {
    name: string;
    category: string;
    description: string;
    units: string;
    unit_symbol: string;
    is_population: boolean;
    /** The legend choice (auto/reference/linear/threshold/ordinal) used to seed the output node. */
    legendType: string;
    /** Manually-configured buckets when a concrete legend type is chosen (else undefined). */
    legendConfig?: { domain: (number | string)[]; range: string[] };
};

/** Result of evaluating a graph without persisting it, shaped for the map component. */
export type CompositePreview = {
    name: string;
    units: string;
    unit_symbol: string;
    legend_type: string;
    legend_config: { domain: number[] | string[]; range: string[] };
    metric_values: MetricValue[];
    /** Distinct non-null years present in `metric_values`, newest first (empty for a timeless graph). */
    years: number[];
};

export type CompositePreviewState = {
    status: 'idle' | 'loading' | 'error' | 'ready';
    data: CompositePreview | null;
    error?: string | null;
};
