import React from 'react';
import { Paper, Tab, Tabs } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import TopBar from 'Iaso/components/nav/TopBarComponent';
import { SxStyles } from 'Iaso/types/general';
import {
    ContentsContainer,
    PageContainer,
} from '../../components/styledComponents';
import { InterventionSettings } from './components/interventionSettings/InterventionSettings';
import { MetricTypeSettings } from './components/metricSettings/MetricTypesSettings';
import { MESSAGES } from './messages';

type TabKey = 'interventionSettings' | 'dataLayersSettings';

const styles: SxStyles = {
    tabsContainer: { marginBottom: 4, borderRadius: 2, paddingX: 2 },
    tabItems: {
        textTransform: 'none',
    },
};

export const Settings: React.FC = () => {
    const { formatMessage } = useSafeIntl();

    const [currentTab, setCurrentTab] =
        React.useState<TabKey>('dataLayersSettings');

    const handleTabChange = (event: React.SyntheticEvent, newValue: TabKey) => {
        setCurrentTab(newValue);
    };

    return (
        <>
            <TopBar title={formatMessage(MESSAGES.title)} />
            <PageContainer>
                <Paper elevation={2} sx={styles.tabsContainer}>
                    <Tabs value={currentTab} onChange={handleTabChange}>
                        <Tab
                            label={formatMessage(MESSAGES.dataLayersTitle)}
                            value="dataLayersSettings"
                            sx={styles.tabItems}
                        />
                        <Tab
                            label={formatMessage(MESSAGES.interventionsTitle)}
                            value="interventionSettings"
                            sx={styles.tabItems}
                        />
                    </Tabs>
                </Paper>
                <ContentsContainer>
                    {currentTab === 'interventionSettings' && (
                        <InterventionSettings />
                    )}
                    {currentTab === 'dataLayersSettings' && (
                        <MetricTypeSettings />
                    )}
                </ContentsContainer>
            </PageContainer>
        </>
    );
};
