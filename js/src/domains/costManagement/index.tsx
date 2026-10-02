import React, { FC, useMemo } from 'react';
import {
    AccountBalanceOutlined,
    RequestQuoteOutlined,
} from '@mui/icons-material';
import { useSafeIntl } from 'bluesquare-components';
import { TabbedPage, TabbedPageTab } from '../../components/TabbedPage';
import { MESSAGES } from '../messages';
import { BudgetManagement } from './budget';
import { GrantManagement } from './grants';

export const CostManagement: FC = () => {
    const { formatMessage } = useSafeIntl();
    const tabs: TabbedPageTab[] = useMemo(
        () => [
            {
                value: 'budget',
                label: formatMessage(MESSAGES.costManagementBudgetTitle),
                Icon: RequestQuoteOutlined,
                Content: BudgetManagement,
            },
            {
                value: 'grants',
                label: formatMessage(MESSAGES.costManagementGrantsTitle),
                Icon: AccountBalanceOutlined,
                Content: GrantManagement,
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
