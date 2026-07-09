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
    comments: FlumeCommentMap;
    /** When provided, updates (re-runs) the existing composite layer instead of creating one. */
    id?: number;
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
