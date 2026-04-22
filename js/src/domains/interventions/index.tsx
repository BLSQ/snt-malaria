import React, { FC, useCallback, useEffect } from 'react';
import { SettingsInputComponent } from '@mui/icons-material';
import { Stack, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import TopBar from 'Iaso/components/nav/TopBarComponent';
import { CardStyled } from '../../components/CardStyled';
import { IconBoxed } from '../../components/IconBoxed';
import {
    CardScrollable,
    MainColumn,
    PageContainer,
    SidebarColumn,
    SidebarLayout,
} from '../../components/styledComponents';
import { MESSAGES } from '../messages';
import { useGetInterventionCategories } from '../planning/hooks/useGetInterventionCategories';
import { Intervention } from '../planning/types/interventions';
import { InterventionFormWrapper } from './components/InterventionFormWrapper';
import { InterventionList } from './components/InterventionList';

export const InterventionSettings: FC = () => {
    const { formatMessage } = useSafeIntl();

    const [selectedIntervention, setSelectedIntervention] =
        React.useState<Intervention | null>(null);

    const { data: interventionCategories } = useGetInterventionCategories();

    const handleSelectIntervention = useCallback(
        (intervention: Intervention) => {
            setSelectedIntervention(intervention);
        },
        [setSelectedIntervention],
    );

    useEffect(() => {
        if (
            interventionCategories &&
            interventionCategories.length > 0 &&
            !selectedIntervention
        ) {
            const firstIntervention =
                interventionCategories[0].interventions[0] || null;
            setSelectedIntervention(firstIntervention);
        }
    }, [interventionCategories, selectedIntervention, setSelectedIntervention]);

    return (
        <>
            <TopBar title={formatMessage(MESSAGES.title)} disableShadow />
            <PageContainer>
                <SidebarLayout>
                    <SidebarColumn>
                        <CardScrollable>
                            <CardStyled
                                header={
                                    <Stack
                                        direction="row"
                                        alignItems="center"
                                        spacing={1}
                                    >
                                        <IconBoxed
                                            Icon={SettingsInputComponent}
                                        ></IconBoxed>
                                        <Typography variant="h6" gutterBottom>
                                            {formatMessage(
                                                MESSAGES.interventionsTitle,
                                            )}
                                        </Typography>
                                    </Stack>
                                }
                            >
                                <InterventionList
                                    interventionCategories={
                                        interventionCategories || []
                                    }
                                    onSelectIntervention={
                                        handleSelectIntervention
                                    }
                                    activeInterventionId={
                                        selectedIntervention?.id || null
                                    }
                                />
                            </CardStyled>
                        </CardScrollable>
                    </SidebarColumn>
                    <MainColumn>
                        <CardScrollable>
                            {selectedIntervention && (
                                <InterventionFormWrapper
                                    interventionId={selectedIntervention.id}
                                />
                            )}
                        </CardScrollable>
                    </MainColumn>
                </SidebarLayout>
            </PageContainer>
        </>
    );
};
