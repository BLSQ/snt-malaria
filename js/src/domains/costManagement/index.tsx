import React, { FC, useMemo } from 'react';
import AccountBalanceOutlined from '@mui/icons-material/AccountBalanceOutlined';
import RequestQuoteOutlined from '@mui/icons-material/RequestQuoteOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import StraightenOutlined from '@mui/icons-material/StraightenOutlined';
import { useSafeIntl } from 'bluesquare-components';
import { TabbedPage, TabbedPageTab } from '../../components/TabbedPage';
import { MESSAGES } from '../messages';
import { BudgetSettingsTab } from './budgetSettings';
import { CostItemsManagement } from './costItems';
import { CostUnitSettings } from './costUnits';
import { GrantManagement } from './grants';

export const CostManagement: FC = () => {
    const { formatMessage } = useSafeIntl();
    const tabs: TabbedPageTab[] = useMemo(
        () => [
            {
                value: 'costItems',
                label: formatMessage(MESSAGES.costItems),
                Icon: RequestQuoteOutlined,
                Content: CostItemsManagement,
            },
            {
                value: 'costUnits',
                label: formatMessage(MESSAGES.costUnitsTitle),
                Icon: StraightenOutlined,
                Content: CostUnitSettings,
            },
            {
                value: 'grants',
                label: formatMessage(MESSAGES.costManagementGrantsTitle),
                Icon: AccountBalanceOutlined,
                Content: GrantManagement,
            },
            {
                value: 'settings',
                label: formatMessage(MESSAGES.settingsTitle),
                Icon: SettingsOutlined,
                Content: BudgetSettingsTab,
            },
        ],
        [formatMessage],
    );

    return (
        <TabbedPage
            title={formatMessage(MESSAGES.costManagementTitle)}
            tabs={tabs}
        />
    );
};
