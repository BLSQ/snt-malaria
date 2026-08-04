import { SvgIconComponent } from '@mui/icons-material';
import CommentOutlinedIcon from '@mui/icons-material/CommentOutlined';
import { useSafeIntl } from 'bluesquare-components';
import { CompositeNodeLibraryDragType } from '../dragAndDrop';
import { MESSAGES } from '../messages';
import { OPERATOR_NODE_TYPE_LIST } from '../nodeTypeRegistry';

type FormatMessage = ReturnType<typeof useSafeIntl>['formatMessage'];

export type NodeLibraryItem = {
    type: CompositeNodeLibraryDragType;
    label: string;
    description: string;
    icon: SvgIconComponent;
};

export type NodeLibraryGroup = {
    label: string;
    items: NodeLibraryItem[];
};

/**
 * The node library's own categories, listed above the data layer ones:
 * - Transformations: a projection of `nodeTypeRegistry.ts`'s node types, which all take layer
 *   values in and return transformed values.
 * - Tools: canvas aids that aren't graph nodes at all, so they have no registry entry.
 */
export const getNodeLibraryGroups = (
    formatMessage: FormatMessage,
): NodeLibraryGroup[] => [
    {
        label: formatMessage(MESSAGES.transformationsCategoryLabel),
        items: OPERATOR_NODE_TYPE_LIST.map(entry => ({
            type: entry.type,
            label: formatMessage(entry.labelMessage),
            description: formatMessage(entry.descriptionMessage),
            icon: entry.icon,
        })),
    },
    {
        label: formatMessage(MESSAGES.toolsCategoryLabel),
        items: [
            {
                type: 'comment' as const,
                label: formatMessage(MESSAGES.commentNodeLabel),
                description: formatMessage(MESSAGES.commentNodeDescription),
                icon: CommentOutlinedIcon,
            },
        ],
    },
];
