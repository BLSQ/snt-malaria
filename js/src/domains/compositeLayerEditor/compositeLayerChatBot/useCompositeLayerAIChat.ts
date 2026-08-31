import { useCallback } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { useAIChat } from '../../../hooks/aiChat/useAIChat';
import { MESSAGES } from '../messages';
import {
    CompositeLayerAIResponse,
    CurrentGraph,
    GeneratedGraph,
} from './types';
import { useSendCompositeLayerAIMessage } from './useSendCompositeLayerAIMessage';

type Args = {
    // Sent with each message so the AI can iterate on the current canvas (null when empty).
    getCurrentGraph: () => CurrentGraph | null;
    onGenerate: (graph: GeneratedGraph) => void;
    // Restores a pre-turn canvas snapshot when the user reverts an AI change.
    onRestoreGraph: (graph: CurrentGraph | null) => void;
};

export const useCompositeLayerAIChat = ({
    getCurrentGraph,
    onGenerate,
    onRestoreGraph,
}: Args) => {
    const { formatMessage } = useSafeIntl();
    const { mutate: sendMessage, isLoading } = useSendCompositeLayerAIMessage();

    return useAIChat({
        endpoint: '/api/snt_malaria/composite_layer_ai/',
        sendMessage,
        isLoading,
        buildRequest: useCallback(
            base => ({ ...base, current_graph: getCurrentGraph() }),
            [getCurrentGraph],
        ),
        onReply: useCallback(
            (data: CompositeLayerAIResponse) => {
                if (data.graph) {
                    onGenerate(data.graph);
                }
            },
            [onGenerate],
        ),
        captureRevertSnapshot: useCallback(
            () => getCurrentGraph(),
            [getCurrentGraph],
        ),
        didApplyChange: useCallback(
            (data: CompositeLayerAIResponse) => Boolean(data.graph),
            [],
        ),
        onRevertSnapshot: useCallback(
            (snapshot: CurrentGraph | null) => onRestoreGraph(snapshot),
            [onRestoreGraph],
        ),
        revertNoteMessage: formatMessage(MESSAGES.compositeLayerAIRevertNote),
        errorMessage: formatMessage(MESSAGES.compositeLayerAIError),
        uploadErrorMessage: useCallback(
            (filename: string) =>
                formatMessage(MESSAGES.compositeLayerAIAttachmentUploadError, {
                    filename,
                }),
            [formatMessage],
        ),
    });
};
