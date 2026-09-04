import { useCallback, useState } from 'react';
import { ConversationEntry } from './types';

type Result = {
    /** The model-facing transcript replayed on each turn, distinct from the displayed messages. */
    history: ConversationEntry[];
    record: (history: ConversationEntry[]) => void;
    reset: () => void;
};

export const useConversationHistory = (): Result => {
    const [history, setHistory] = useState<ConversationEntry[]>([]);
    const reset = useCallback(() => setHistory([]), []);
    return { history, record: setHistory, reset };
};
