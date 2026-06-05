import React, { FC, useCallback, useEffect } from 'react';
import { StraightenOutlined, VaccinesOutlined } from '@mui/icons-material';
import { Box, Tab, Tabs } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import TopBar from 'Iaso/components/nav/TopBarComponent';
import { useSearchParams } from 'react-router-dom';
import { PageContainer } from '../../components/styledComponents';
import { MESSAGES } from '../messages';
import { CostUnitSettings } from './costUnits';
import { InterventionSettings } from './interventions';

type SettingsTab = 'interventions' | 'costUnits';

const DEFAULT_TAB: SettingsTab = 'interventions';

export const Settings: FC = () => {
    const { formatMessage } = useSafeIntl();
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = (searchParams.get('tab') as SettingsTab) ?? DEFAULT_TAB;

    const handleChangeTab = useCallback(
        (_event: React.SyntheticEvent, newTab: SettingsTab) => {
            const next = new URLSearchParams(searchParams);
            next.set('tab', newTab);
            setSearchParams(next, { replace: true });
        },
        [searchParams, setSearchParams],
    );

    // Reflect the active tab in the URL as a query param when it is missing
    // (e.g. on first load), so the tab is always shareable/bookmarkable.
    useEffect(() => {
        if (!searchParams.get('tab')) {
            const next = new URLSearchParams(searchParams);
            next.set('tab', tab);
            setSearchParams(next, { replace: true });
        }
    }, [searchParams, tab, setSearchParams]);

    return (
        <>
            <TopBar
                title={formatMessage(MESSAGES.settingsTitle)}
                disableShadow
            />
            <PageContainer
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: theme => theme.spacing(2),
                }}
            >
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs
                        value={tab}
                        textColor="primary"
                        indicatorColor="primary"
                        onChange={handleChangeTab}
                    >
                        <Tab
                            value="interventions"
                            icon={<VaccinesOutlined fontSize="small" />}
                            iconPosition="start"
                            label={formatMessage(MESSAGES.interventionsTitle)}
                            sx={{ textTransform: 'none', minHeight: 48 }}
                        />
                        <Tab
                            value="costUnits"
                            icon={<StraightenOutlined fontSize="small" />}
                            iconPosition="start"
                            label={formatMessage(MESSAGES.costUnitsTitle)}
                            sx={{ textTransform: 'none', minHeight: 48 }}
                        />
                    </Tabs>
                </Box>
                <Box sx={{ flex: 1, minHeight: 0 }}>
                    {tab === 'interventions' && <InterventionSettings />}
                    {tab === 'costUnits' && <CostUnitSettings />}
                </Box>
            </PageContainer>
        </>
    );
};
