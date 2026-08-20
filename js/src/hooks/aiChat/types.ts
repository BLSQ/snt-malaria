export type AttachmentReference = {
    file_id: string;
    filename: string;
};

export type ConversationEntry = {
    role: 'user' | 'assistant';
    content: string;
    attachments?: AttachmentReference[];
};

export type UploadedAttachment = {
    file_id: string;
    filename: string;
    size_bytes: number;
};

export type QuickReplyQuestion = {
    question: string;
    options: string[];
};

/** The fields every AI chat request carries; each feature adds its own on top. */
export type AIChatRequest = {
    message: string;
    conversation_history: ConversationEntry[];
    attachments?: AttachmentReference[];
};

/** The fields every AI chat response carries; each feature adds its own payload on top. */
export type AIChatResponse = {
    assistant_message: string;
    quick_replies: QuickReplyQuestion[] | null;
    conversation_history: ConversationEntry[];
};
