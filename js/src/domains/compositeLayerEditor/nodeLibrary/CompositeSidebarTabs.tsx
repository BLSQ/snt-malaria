import React, { FC } from 'react';
import { Tab, Tabs, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../messages';

export type CompositeSidebarTab = 'library' | 'ai';

const styles = {
    tab: { textTransform: 'none', minHeight: 48 },
} satisfies SxStyles;

type Props = {
    tab: CompositeSidebarTab;
    onChangeTab: (tab: CompositeSidebarTab) => void;
    /** Whether the AI chat is available at all (the account has an AI API key configured). With
     * no chat to switch to there is nothing to tab between, so a plain title is shown instead. */
    showTabs: boolean;
};

/** Switches the composite editor's sidebar between the node library and the AI chat. */
export const CompositeSidebarTabs: FC<Props> = ({
    tab,
    onChangeTab,
    showTabs,
}) => {
    const { formatMessage } = useSafeIntl();
    if (!showTabs) {
        return (
            <Typography variant="h6">
                {formatMessage(MESSAGES.nodeLibraryTabLabel)}
            </Typography>
        );
    }
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
                sx={styles.tab}
            />
            <Tab
                value="ai"
                label={formatMessage(MESSAGES.aiModeTabLabel)}
                sx={styles.tab}
            />
        </Tabs>
    );
};
