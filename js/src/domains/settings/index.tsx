import React from 'react';
import { useSafeIntl } from 'bluesquare-components';
import TopBar from 'Iaso/components/nav/TopBarComponent';
import {
    ContentsContainer,
    PageContainer,
} from '../../components/styledComponents';
import { InterventionSettings } from './components/interventionSettings/InterventionSettings';
import { MESSAGES } from './messages';

export const Settings: React.FC = () => {
    const { formatMessage } = useSafeIntl();
    return (
        <>
            <TopBar title={formatMessage(MESSAGES.title)} />
            <PageContainer>
                <ContentsContainer>
                    <InterventionSettings />
                </ContentsContainer>
            </PageContainer>
        </>
    );
};
