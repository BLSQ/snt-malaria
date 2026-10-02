import React, { FC, useMemo } from 'react';
import { SettingsOutlined, StraightenOutlined } from '@mui/icons-material';
import { useSafeIntl } from 'bluesquare-components';
import { TabbedPage, TabbedPageTab } from '../../components/TabbedPage';
import { MESSAGES } from '../messages';
import { CostUnitSettings } from './costUnits';
import { GeneralSettings } from './general';

export const Settings: FC = () => {
    const { formatMessage } = useSafeIntl();
    const tabs: TabbedPageTab[] = useMemo(
        () => [
            {
                value: 'costUnits',
                label: formatMessage(MESSAGES.costUnitsTitle),
                Icon: StraightenOutlined,
                Content: CostUnitSettings,
            },
            {
                value: 'general',
                label: formatMessage(MESSAGES.generalTitle),
                Icon: SettingsOutlined,
                Content: GeneralSettings,
            },
        ],
        [formatMessage],
    );

    return (
        <TabbedPage title={formatMessage(MESSAGES.settingsTitle)} tabs={tabs} />
    );
};
