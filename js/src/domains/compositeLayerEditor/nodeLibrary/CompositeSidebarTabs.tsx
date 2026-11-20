import React, { FC } from 'react';
import Box from '@mui/material/Box/Box';
import Tab from '@mui/material/Tab/Tab';
import Tabs from '@mui/material/Tabs/Tabs';
import Typography from '@mui/material/Typography/Typography';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../messages';

export type CompositeSidebarTab = 'library' | 'ai';

const styles = {
    noTabsTitle: {
        display: 'flex',
        alignItems: 'center',
        minHeight: theme => theme.spacing(6),
    },
    tab: { textTransform: 'none', minHeight: 48 },
} satisfies SxStyles;

type Props = {
    tab: CompositeSidebarTab;
    onChangeTab: (tab: CompositeSidebarTab) => void;
    /** False when the account has no AI API key: nothing to tab to, so a title is shown. */
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
            <Box sx={styles.noTabsTitle}>
                <Typography variant="h6">
                    {formatMessage(MESSAGES.nodeLibraryTabLabel)}
                </Typography>
            </Box>
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
