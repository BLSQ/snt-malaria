import React, { FC, useCallback, useEffect } from 'react';
import {
    AccountBalanceOutlined,
    SettingsOutlined,
    StraightenOutlined,
    VaccinesOutlined,
} from '@mui/icons-material';
import { Box, Tab, Tabs } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import TopBar from 'Iaso/components/nav/TopBarComponent';
import { useSearchParams } from 'react-router-dom';
import { PageContainer } from '../../components/styledComponents';
import { MESSAGES } from '../messages';
import { CostUnitSettings } from './costUnits';
import { GeneralSettings } from './general';
import { GrantSettings } from './grants';
import { InterventionSettings } from './interventions';

type SettingsTab = 'interventions' | 'costUnits' | 'grants' | 'general';

const SETTINGS_TABS: SettingsTab[] = [
    'interventions',
    'costUnits',
    'grants',
    'general',
];

const DEFAULT_TAB: SettingsTab = 'interventions';

export const Settings: FC = () => {
    const { formatMessage } = useSafeIntl();
    const [searchParams, setSearchParams] = useSearchParams();
    const tabParam = searchParams.get('tab') as SettingsTab | null;
    // Fall back to the default for missing/unknown tabs (e.g. the legacy
    // "budget" tab, now a sub-entry of "general").
    const tab =
        tabParam && SETTINGS_TABS.includes(tabParam) ? tabParam : DEFAULT_TAB;

    const handleChangeTab = useCallback(
        (_event: React.SyntheticEvent, newTab: SettingsTab) => {
            const next = new URLSearchParams(searchParams);
            next.set('tab', newTab);
            setSearchParams(next, { replace: true });
        },
        [searchParams, setSearchParams],
    );

    // Reflect the active tab in the URL as a query param when it is missing or
    // unknown (e.g. on first load, or the legacy "budget" tab), so the tab is
    // always valid and shareable/bookmarkable.
    useEffect(() => {
        if (searchParams.get('tab') !== tab) {
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
                    alignItems: 'center',
                    gap: theme => theme.spacing(2),
                    // Cap and center the whole settings content (tab bar and
                    // panels) instead of constraining each form individually.
                    '& > *': {
                        width: '100%',
                        maxWidth: 1440,
                    },
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
                        <Tab
                            value="grants"
                            icon={<AccountBalanceOutlined fontSize="small" />}
                            iconPosition="start"
                            label={formatMessage(MESSAGES.grantsTitle)}
                            sx={{ textTransform: 'none', minHeight: 48 }}
                        />
                        <Tab
                            value="general"
                            icon={<SettingsOutlined fontSize="small" />}
                            iconPosition="start"
                            label={formatMessage(MESSAGES.generalTitle)}
                            sx={{ textTransform: 'none', minHeight: 48 }}
                        />
                    </Tabs>
                </Box>
                <Box sx={{ flex: 1, minHeight: 0 }}>
                    {tab === 'interventions' && <InterventionSettings />}
                    {tab === 'costUnits' && <CostUnitSettings />}
                    {tab === 'grants' && <GrantSettings />}
                    {tab === 'general' && <GeneralSettings />}
                </Box>
            </PageContainer>
        </>
    );
};
