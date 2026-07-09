import React, { MutableRefObject, RefObject, useRef, useState } from 'react';
import { FlumeCommentMap } from 'flume';
import { DATA_LAYER_DND_MIME } from '../../dataLayers/dragAndDrop';
import { FlumeGraph, FlumeGraphNode } from '../types/flumeGraph';
import { getStageElement, readStageTransform } from '../utils/flumeStage';

type UseCanvasDropArgs = {
    /** Ref to the element wrapping the `<NodeEditor>`. */
    canvasRef: RefObject<HTMLDivElement>;
    /** Live working copies of the graph + comments (kept up to date by the editor's onChange). */
    nodesRef: MutableRefObject<FlumeGraph>;
    commentsRef: MutableRefObject<FlumeCommentMap>;
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
 * Drop a data layer from the sidebar onto the canvas → create a `dataLayer` node with it
 * preselected. Flume has no imperative "add node" API and its context menu lives in a portal
 * outside our React root (so synthetic clicks won't reach it), so instead we build the node
 * ourselves and remount the editor with the new graph. To keep the view from jumping, we read
 * the live stage transform and: (a) drop the node under the cursor, (b) shift every existing
 * node/comment by the current translation, and (c) restore the current scale — with translate
 * reset to 0, everything then renders exactly where it was.
 */
export const useCanvasDrop = ({
    canvasRef,
    nodesRef,
    commentsRef,
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
        const { scale, translateX, translateY } = readStageTransform(stage);

        // Drop point in the post-remount stage space (translate becomes 0 after remount).
        const dropX = (event.clientX - rect.left - rect.width / 2) / scale;
        const dropY = (event.clientY - rect.top - rect.height / 2) / scale;
        // Amount every existing node/comment must move so it stays put once translate resets to 0.
        const shiftX = translateX / scale;
        const shiftY = translateY / scale;

        const shiftedNodes: FlumeGraph = {};
        Object.entries(nodesRef.current || {}).forEach(([id, node]) => {
            shiftedNodes[id] = {
                ...node,
                x: (node.x ?? 0) - shiftX,
                y: (node.y ?? 0) - shiftY,
            };
        });
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

        const shiftedComments: FlumeCommentMap = {};
        Object.entries(commentsRef.current || {}).forEach(([id, comment]) => {
            shiftedComments[id] = {
                ...comment,
                x: (comment.x ?? 0) - shiftX,
                y: (comment.y ?? 0) - shiftY,
            };
        });

        nodesRef.current = shiftedNodes;
        commentsRef.current = shiftedComments;
        mountGraphRef.current = shiftedNodes;
        mountCommentsRef.current = shiftedComments;
        mountScaleRef.current = scale;
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
