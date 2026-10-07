import React, { FC } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import TopBar from 'Iaso/components/nav/TopBarComponent';
import { SxStyles } from 'Iaso/types/general';
import { PageContainer } from '../../components/styledComponents';
import { MESSAGES } from '../messages';
import { AccountSettingsTab } from './accountSettings';

const styles = {
    pageContainer: {
        display: 'flex',
        justifyContent: 'center',
        '& > *': {
            width: '100%',
            maxWidth: 1440,
        },
    },
} satisfies SxStyles;

export const Settings: FC = () => {
    const { formatMessage } = useSafeIntl();
    return (
        <>
            <TopBar
                title={formatMessage(MESSAGES.settingsTitle)}
                disableShadow
            />
            <PageContainer sx={styles.pageContainer}>
                <AccountSettingsTab />
            </PageContainer>
        </>
    );
};
