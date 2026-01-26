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
import { hasFeatureFlag } from 'Iaso/utils/featureFlags';
import { useCurrentUser } from 'Iaso/utils/usersUtils';

type TabKey = 'interventionSettings' | 'dataLayersSettings';

const styles: SxStyles = {
    tabsContainer: { marginBottom: 4, borderRadius: 2, paddingX: 2 },
    tabItems: {
        textTransform: 'none',
    },
};

export const Settings: React.FC = () => {
    const { formatMessage } = useSafeIntl();

    const currentUser = useCurrentUser();
    const showLayersTab = hasFeatureFlag(currentUser, 'SHOW_DEV_FEATURES');
    const [currentTab, setCurrentTab] = React.useState<TabKey>(
        showLayersTab ? 'dataLayersSettings' : 'interventionSettings',
    );

    const handleTabChange = (event: React.SyntheticEvent, newValue: TabKey) => {
        setCurrentTab(newValue);
    };

    return (
        <>
            <TopBar title={formatMessage(MESSAGES.title)} />
            <PageContainer>
                <Paper elevation={2} sx={styles.tabsContainer}>
                    <Tabs value={currentTab} onChange={handleTabChange}>
                        {showLayersTab && (
                            <Tab
                                label={formatMessage(MESSAGES.dataLayersTitle)}
                                value="dataLayersSettings"
                                sx={styles.tabItems}
                            />
                        )}
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
                    {currentTab === 'dataLayersSettings' && showLayersTab && (
                        <MetricTypeSettings />
                    )}
                </ContentsContainer>
            </PageContainer>
        </>
    );
};
