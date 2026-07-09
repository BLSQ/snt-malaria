// Custom MIME type used to carry a MetricType id when dragging a data layer from the sidebar list
// onto the composite editor canvas to create a `dataLayer` node. Kept in its own module so both the
// drag source (data layer list) and drop target (composite editor) can share it without pulling in
// each other's heavier modules.
export const DATA_LAYER_DND_MIME = 'application/x-snt-metric-type-id';
