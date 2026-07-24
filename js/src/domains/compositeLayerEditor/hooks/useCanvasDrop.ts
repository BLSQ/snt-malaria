import React, { MutableRefObject, RefObject, useRef, useState } from 'react';
import { FlumeCommentMap } from 'flume';
import { DATA_LAYER_DND_MIME } from '../../dataLayers/dragAndDrop';
import { FlumeGraph, FlumeGraphNode } from '../types/flumeGraph';
import {
    getStageElement,
    readStageTransform,
    shiftGraphForRemount,
} from '../utils/flumeStage';

type UseCanvasDropArgs = {
    /** Ref to the element wrapping the `<NodeEditor>`. */
    canvasRef: RefObject<HTMLDivElement>;
    /** Live working copies of the graph + comments (kept up to date by the editor's onChange). */
    nodesRef: MutableRefObject<FlumeGraph>;
    commentsRef: MutableRefObject<FlumeCommentMap>;
    /** Called right before a valid drop bumps `mountNonce`. index.tsx uses it to clear its
     * AI-pushed graph state, which otherwise keeps rendering priority over `mountGraphRef` and
     * would make drops after an AI generation or rearrange silently no-op. */
    onBeforeRemount?: () => void;
};

type UseCanvasDrop = {
    /**
     * Bumped on every drop; used as part of the `NodeEditor` key so the editor remounts with the
     * mutated graph. `0` means "initial mount" (render the loaded layer, not the drop state).
     */
    mountNonce: number;
    /** Graph / comments / scale for the `NodeEditor` to restore on a drop-triggered remount. */
    mountGraphRef: MutableRefObject<FlumeGraph | undefined>;
    mountCommentsRef: MutableRefObject<FlumeCommentMap | undefined>;
    mountScaleRef: MutableRefObject<number | undefined>;
    handleCanvasDrop: (event: React.DragEvent<HTMLDivElement>) => void;
};

/**
 * Drop a data layer from the sidebar onto the canvas → build a preselected `dataLayer` node and
 * remount with the new graph (Flume has no imperative "add node" API). To keep the view from
 * jumping, `shiftGraphForRemount` pre-shifts everything by the current pan and the scale is
 * restored, so the only visible change is the new node appearing under the cursor.
 */
export const useCanvasDrop = ({
    canvasRef,
    nodesRef,
    commentsRef,
    onBeforeRemount,
}: UseCanvasDropArgs): UseCanvasDrop => {
    const [mountNonce, setMountNonce] = useState(0);
    const mountGraphRef = useRef<FlumeGraph>();
    const mountCommentsRef = useRef<FlumeCommentMap>();
    const mountScaleRef = useRef<number>();

    const handleCanvasDrop = (event: React.DragEvent<HTMLDivElement>) => {
        const raw =
            event.dataTransfer.getData(DATA_LAYER_DND_MIME) ||
            event.dataTransfer.getData('text/plain');
        const metricTypeId = raw ? Number(raw) : NaN;
        if (!raw || Number.isNaN(metricTypeId)) return;
        event.preventDefault();

        const stage = getStageElement(canvasRef.current);
        if (!stage) return;
        const rect = stage.getBoundingClientRect();
        const { scale } = readStageTransform(stage);

        // Drop point in the post-remount stage space (translate becomes 0 after remount).
        const dropX = (event.clientX - rect.left - rect.width / 2) / scale;
        const dropY = (event.clientY - rect.top - rect.height / 2) / scale;

        const {
            nodes: shiftedNodes,
            comments: shiftedComments,
            scale: capturedScale,
        } = shiftGraphForRemount(
            nodesRef.current || {},
            commentsRef.current || {},
            canvasRef.current,
        );

        const newNodeId = `dl-${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;
        const newNode: FlumeGraphNode = {
            id: newNodeId,
            x: dropX,
            y: dropY,
            type: 'dataLayer',
            width: 330,
            connections: { inputs: {}, outputs: {} },
            inputData: { metricType: { metricTypeId } },
        };
        shiftedNodes[newNodeId] = newNode;

        nodesRef.current = shiftedNodes;
        commentsRef.current = shiftedComments;
        mountGraphRef.current = shiftedNodes;
        mountCommentsRef.current = shiftedComments;
        mountScaleRef.current = capturedScale;
        onBeforeRemount?.();
        setMountNonce(nonce => nonce + 1);
    };

    return {
        mountNonce,
        mountGraphRef,
        mountCommentsRef,
        mountScaleRef,
        handleCanvasDrop,
    };
};
