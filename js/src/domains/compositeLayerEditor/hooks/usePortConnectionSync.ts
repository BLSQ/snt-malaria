import { RefObject, useCallback } from 'react';
import { FlumeGraph } from '../types/flumeGraph';

/**
 * Flags each connector dot with `data-connected` so the theme can colour it (grey when empty,
 * primary once wired up). Flume doesn't expose connection state on the port DOM, so we derive
 * it from the graph's connections and match handles by their node id / transput / port name.
 */
export const usePortConnectionSync = (
    canvasRef: RefObject<HTMLElement>,
): ((nodes: FlumeGraph) => void) =>
    useCallback(
        (nodes: FlumeGraph) => {
            const root = canvasRef.current;
            if (!root) return;
            const connected = new Set<string>();
            Object.values(nodes || {}).forEach(node => {
                (['inputs', 'outputs'] as const).forEach(side => {
                    const transput = side === 'inputs' ? 'input' : 'output';
                    const ports = node?.connections?.[side] ?? {};
                    Object.keys(ports).forEach(portName => {
                        if (ports[portName]?.length) {
                            connected.add(`${node.id}|${transput}|${portName}`);
                        }
                    });
                });
            });
            root.querySelectorAll<HTMLElement>(
                '[data-flume-component="port-handle"]',
            ).forEach(handle => {
                const key = `${handle.dataset.nodeId}|${handle.dataset.portTransputType}|${handle.dataset.portName}`;
                handle.dataset.connected = connected.has(key)
                    ? 'true'
                    : 'false';
            });
        },
        [canvasRef],
    );
