import { FlumeCommentMap } from 'flume';
import {
    MetricType,
    MetricValue,
    ScaleDomainRange,
} from '../../dataLayers/types/metrics';
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
    /** Requested legend, mirrored on the graph's output node (auto/reference/linear/…). */
    legend_type: string;
    /** Manually-configured buckets, set for a concrete legend type. */
    legend_config: ScaleDomainRange;
    legend_reference_metric_type: number | null;
    created_at: string;
    updated_at: string;
};

export type CompositeLayerListItem = Pick<
    CompositeLayer,
    | 'id'
    | 'name'
    | 'metric_type'
    | 'legend_type'
    | 'legend_config'
    | 'created_at'
    | 'updated_at'
>;

export type SaveCompositeLayerPayload = {
    /** When provided, updates the existing composite layer instead of creating one. */
    id?: number;
    /** Sent by the node editor; a metadata-only save leaves it out. */
    graph?: FlumeGraph;
    comments?: FlumeCommentMap;
    name?: string;
    category?: string;
    description?: string;
    units?: string;
    unit_symbol?: string;
    is_population?: boolean;
    legend_type?: string;
    legend_config?: { domain: (number | string)[]; range: string[] };
};

/** Result of evaluating a graph without persisting it, shaped for the map component. */
export type CompositePreview = {
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
