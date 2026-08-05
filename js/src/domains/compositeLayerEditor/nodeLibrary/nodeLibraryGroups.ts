import { useMemo } from 'react';
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
 * The library's own categories, above the data layer ones. Tools are canvas aids rather than graph
 * nodes, so they have no `nodeTypeRegistry` entry. Memoizes internally so callers don't need their
 * own `useMemo` to avoid rebuilding this on every render.
 */
export const useNodeLibraryGroups = (
    formatMessage: FormatMessage,
): NodeLibraryGroup[] =>
    useMemo(
        () => [
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
                        description: formatMessage(
                            MESSAGES.commentNodeDescription,
                        ),
                        icon: CommentOutlinedIcon,
                    },
                ],
            },
        ],
        [formatMessage],
    );
