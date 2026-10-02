import React, { FC, useMemo } from 'react';
import { SvgIconComponent } from '@mui/icons-material';
import { Box, Tab, Tabs } from '@mui/material';
import TopBar from 'Iaso/components/nav/TopBarComponent';
import { SxStyles } from 'Iaso/types/general';
import { useQueryParamTab } from '../hooks/useQueryParamTab';
import { PageContainer } from './styledComponents';

export type TabbedPageTab = {
    value: string;
    label: string;
    Icon: SvgIconComponent;
    Content: FC;
};

type Props = {
    title: string;
    // The first tab is the default one.
    tabs: TabbedPageTab[];
};

const styles = {
    pageContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: theme => theme.spacing(2),
        // Cap and center the whole content (tab bar and panels) instead of
        // constraining each panel individually.
        '& > *': {
            width: '100%',
            maxWidth: 1440,
        },
    },
    tabBar: { borderBottom: 1, borderColor: 'divider' },
    tab: { textTransform: 'none', minHeight: 48 },
    tabPanel: { flex: 1, minHeight: 0 },
} satisfies SxStyles;

export const TabbedPage: FC<Props> = ({ title, tabs }) => {
    const tabValues = useMemo(() => tabs.map(({ value }) => value), [tabs]);
    const [activeTab, handleChangeTab] = useQueryParamTab(
        tabValues,
        tabValues[0],
    );
    const ActiveContent = tabs.find(
        ({ value }) => value === activeTab,
    )?.Content;

    return (
        <>
            <TopBar title={title} disableShadow />
            <PageContainer sx={styles.pageContainer}>
                <Box sx={styles.tabBar}>
                    <Tabs
                        value={activeTab}
                        textColor="primary"
                        indicatorColor="primary"
                        onChange={handleChangeTab}
                    >
                        {tabs.map(({ value, label, Icon }) => (
                            <Tab
                                key={value}
                                value={value}
                                icon={<Icon fontSize="small" />}
                                iconPosition="start"
                                label={label}
                                sx={styles.tab}
                            />
                        ))}
                    </Tabs>
                </Box>
                <Box sx={styles.tabPanel}>
                    {ActiveContent && <ActiveContent />}
                </Box>
            </PageContainer>
        </>
    );
};
