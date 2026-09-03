import { useCallback, useRef } from 'react';
import { AIChatResponse } from './types';

type Args<TResponse extends AIChatResponse, TSnapshot> = {
    captureRevertSnapshot?: () => TSnapshot;
    didApplyChange?: (data: TResponse) => boolean;
};

type Result<TResponse extends AIChatResponse, TSnapshot> = {
    /** Stores the pre-turn snapshot under `messageId` when the reply is an applied change, and
     * reports whether that message should offer a Revert action. Safe to call before the reply is
     * applied client-side, so the captured state is still pre-turn. */
    captureIfApplied: (messageId: string, data: TResponse) => boolean;
    getSnapshot: (messageId: string) => TSnapshot | undefined;
    clearSnapshots: () => void;
};

/** Pre-turn snapshots keyed by the assistant message they can restore to. A ref, not state:
 * nothing rendered reads it, it only needs to be current when a revert fires. */
export const useRevertSnapshots = <
    TResponse extends AIChatResponse,
    TSnapshot,
>({
    captureRevertSnapshot,
    didApplyChange,
}: Args<TResponse, TSnapshot>): Result<TResponse, TSnapshot> => {
    const snapshots = useRef<Map<string, TSnapshot>>(new Map());

    const captureIfApplied = useCallback(
        (messageId: string, data: TResponse): boolean => {
            const revertable =
                Boolean(captureRevertSnapshot) && !!didApplyChange?.(data);
            if (revertable) {
                snapshots.current.set(messageId, captureRevertSnapshot!());
            }
            return revertable;
        },
        [captureRevertSnapshot, didApplyChange],
    );

    const getSnapshot = useCallback(
        (messageId: string) => snapshots.current.get(messageId),
        [],
    );

    const clearSnapshots = useCallback(() => snapshots.current.clear(), []);

    return { captureIfApplied, getSnapshot, clearSnapshots };
};
