import React from 'react';
import { Card, CardContent, CardHeader } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import TopBar from 'Iaso/components/nav/TopBarComponent';
import {
    ContentsContainer,
    PageContainer,
} from '../../components/styledComponents';
import { MESSAGES } from './messages';

export const Settings: React.FC = () => {
    const { formatMessage } = useSafeIntl();
    return (
        <>
            <TopBar title={formatMessage(MESSAGES.title)} />
            <PageContainer>
                <ContentsContainer>
                    <Card>
                        <CardHeader
                            title={formatMessage(MESSAGES.interventionsTitle)}
                            subheader={formatMessage(
                                MESSAGES.interventionsSubtitle,
                            )}
                            titleTypographyProps={{ variant: 'h6' }}
                            subheaderTypographyProps={{ variant: 'subtitle1' }}
                        ></CardHeader>
                        <CardContent>
                            <p>Settings content goes here.</p>
                        </CardContent>
                    </Card>
                </ContentsContainer>
            </PageContainer>
        </>
    );
};
