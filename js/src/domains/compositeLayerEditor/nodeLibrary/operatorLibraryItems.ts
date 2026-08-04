import { SvgIconComponent } from '@mui/icons-material';
import CommentOutlinedIcon from '@mui/icons-material/CommentOutlined';
import { useSafeIntl } from 'bluesquare-components';
import { CompositeNodeLibraryDragType } from '../dragAndDrop';
import { MESSAGES } from '../messages';
import { OPERATOR_NODE_TYPE_LIST } from '../nodeTypeRegistry';

type FormatMessage = ReturnType<typeof useSafeIntl>['formatMessage'];

export type OperatorLibraryItem = {
    type: CompositeNodeLibraryDragType;
    label: string;
    description: string;
    icon: SvgIconComponent;
};

/**
 * The node library's "Opérateurs" entries: a thin projection of `nodeTypeRegistry.ts`'s 4
 * operator node types, plus `Comment` (a Flume canvas annotation, not a node type, so not part of
 * that registry).
 */
export const getOperatorLibraryItems = (
    formatMessage: FormatMessage,
): OperatorLibraryItem[] => [
    ...OPERATOR_NODE_TYPE_LIST.map(entry => ({
        type: entry.type,
        label: formatMessage(entry.labelMessage),
        description: formatMessage(entry.descriptionMessage),
        icon: entry.icon,
    })),
    {
        type: 'comment' as const,
        label: formatMessage(MESSAGES.commentNodeLabel),
        description: formatMessage(MESSAGES.commentNodeDescription),
        icon: CommentOutlinedIcon,
    },
];
