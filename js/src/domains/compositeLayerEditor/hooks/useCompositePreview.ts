import { useCallback, useEffect, useRef, useState } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../messages';
import {
    CompositePreview,
    CompositePreviewState,
} from '../types/compositeLayer';
import { FlumeGraph } from '../types/flumeGraph';
import { isOutputConnected } from '../utils/graph';
import { usePreviewCompositeLayer } from './usePreviewCompositeLayer';

// Debounce graph edits before re-running the (non-persisted) preview evaluation on the backend.
const PREVIEW_DEBOUNCE_MS = 500;

type UseCompositePreview = {
    preview: CompositePreviewState;
    /** Re-run the graph immediately (e.g. on initial load or after a drop). */
    runPreview: (graph: FlumeGraph) => void;
    /** Re-run the graph after the debounce delay, resetting any pending run. */
    schedulePreview: (graph: FlumeGraph) => void;
    /** Cancel any pending run and show the "connect the output" message instead of a stale map. */
    markDisconnected: () => void;
};

/**
 * Debounced, non-persisted evaluation of the graph on the backend, driving the output node's live
 * preview map.
 */
export const useCompositePreview = (): UseCompositePreview => {
    const { formatMessage } = useSafeIntl();
    const { mutate: previewCompositeLayer } = usePreviewCompositeLayer();
    const [preview, setPreview] = useState<CompositePreviewState>({
        status: 'idle',
        data: null,
    });
    const previewTimer = useRef<ReturnType<typeof setTimeout>>();

    const markDisconnected = useCallback(() => {
        if (previewTimer.current) clearTimeout(previewTimer.current);
        setPreview({
            status: 'error',
            data: null,
            error: formatMessage(MESSAGES.disconnected),
        });
    }, [formatMessage]);

    const runPreview = useCallback(
        (graph: FlumeGraph) => {
            // Nothing feeds the output: clear the preview map instead of keeping a stale one.
            if (!isOutputConnected(graph)) {
                markDisconnected();
                return;
            }
            setPreview(prev => ({ ...prev, status: 'loading' }));
            previewCompositeLayer(graph, {
                onSuccess: (data: CompositePreview) =>
                    setPreview({ status: 'ready', data }),
                onError: (error: any) => {
                    // The backend returns the reason (e.g. "not connected") as a DRF field error.
                    const detail = error?.details?.graph;
                    const message = Array.isArray(detail) ? detail[0] : detail;
                    // Keep the last good map, but surface why it's stale.
                    setPreview(prev => ({
                        status: 'error',
                        data: prev.data,
                        error: message,
                    }));
                },
            });
        },
        [previewCompositeLayer, markDisconnected],
    );

    const schedulePreview = useCallback(
        (graph: FlumeGraph) => {
            if (previewTimer.current) clearTimeout(previewTimer.current);
            previewTimer.current = setTimeout(
                () => runPreview(graph),
                PREVIEW_DEBOUNCE_MS,
            );
        },
        [runPreview],
    );

    useEffect(
        () => () => {
            if (previewTimer.current) clearTimeout(previewTimer.current);
        },
        [],
    );

    return { preview, runPreview, schedulePreview, markDisconnected };
};
