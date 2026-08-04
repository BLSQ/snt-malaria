import React, { FC } from 'react';
import { Tab, Tabs } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../messages';

export type CompositeSidebarTab = 'library' | 'ai';

const tabSx = { textTransform: 'none', minHeight: 48 } as const;

type Props = {
    tab: CompositeSidebarTab;
    onChangeTab: (tab: CompositeSidebarTab) => void;
};

/**
 * Tabs at the top of the composite editor's sidebar, switching between the node library and the
 * AI chat. Only rendered when the account has an AI API key configured (see `dataLayers/index.tsx`)
 * - otherwise the sidebar is just the node library, no tabs needed.
 */
export const CompositeSidebarTabsHeader: FC<Props> = ({
    tab,
    onChangeTab,
}) => {
    const { formatMessage } = useSafeIntl();
    return (
        <Tabs
            value={tab}
            textColor="primary"
            indicatorColor="primary"
            onChange={(_event, newTab: CompositeSidebarTab) =>
                onChangeTab(newTab)
            }
        >
            <Tab
                value="library"
                label={formatMessage(MESSAGES.nodeLibraryTabLabel)}
                sx={tabSx}
            />
            <Tab
                value="ai"
                label={formatMessage(MESSAGES.aiModeTabLabel)}
                sx={tabSx}
            />
        </Tabs>
    );
};
