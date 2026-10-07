import React, { FC, useMemo } from 'react';
import { CategoryOutlined, VaccinesOutlined } from '@mui/icons-material';
import { useSafeIntl } from 'bluesquare-components';
import { TabbedPage, TabbedPageTab } from '../../components/TabbedPage';
import { MESSAGES } from '../messages';
import { InterventionCategoriesTab } from './components/InterventionCategoriesTab';
import { InterventionsTab } from './components/InterventionsTab';

export const Interventions: FC = () => {
    const { formatMessage } = useSafeIntl();
    const tabs: TabbedPageTab[] = useMemo(
        () => [
            {
                value: 'interventions',
                label: formatMessage(MESSAGES.interventionsTitle),
                Icon: VaccinesOutlined,
                Content: InterventionsTab,
            },
            {
                value: 'categories',
                label: formatMessage(MESSAGES.interventionCategoriesTitle),
                Icon: CategoryOutlined,
                Content: InterventionCategoriesTab,
            },
        ],
        [formatMessage],
    );

    return (
        <TabbedPage
            title={formatMessage(MESSAGES.interventionsTitle)}
            tabs={tabs}
        />
    );
};
