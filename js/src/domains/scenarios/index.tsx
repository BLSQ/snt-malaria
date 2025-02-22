import React, { FC } from 'react';
import { Box, Button, Theme } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import {
    ContentsContainer,
    PageContainer,
} from '../../components/styledComponents';
import TopBar from 'Iaso/components/nav/TopBarComponent';

import { ScenarioComponent } from './components/ScenarioComponent';
import { useGetScenarios } from './hooks/useGetScenarios';
import { MESSAGES } from './messages';
import { SxStyles } from 'Iaso/types/general';

const styles: SxStyles = {
    buttonsBox: (theme: Theme) => ({
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'right',
        width: '100%',
        marginBottom: theme.spacing(4),
    }),
};

export const Scenarios: FC = () => {
    const { formatMessage } = useSafeIntl();
    const { data: scenarios, isLoading } = useGetScenarios();

    const onCreateScenario = () => {
        console.log('Creating new scenario');
    };

    return (
        <>
            <TopBar title={formatMessage(MESSAGES.title)} disableShadow />
            <PageContainer>
                <ContentsContainer>
                    <Box sx={styles.buttonsBox}>
                        <div>{/* empty div for styling purposes */}</div>
                        <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            onClick={onCreateScenario}
                        >
                            Create scenario
                        </Button>
                    </Box>

                    {isLoading && <p>Loading data...</p>}
                    {!isLoading &&
                        scenarios &&
                        scenarios.map((scenario: Scenario) => (
                            <ScenarioComponent
                                key={scenario.id}
                                scenario={scenario}
                            />
                        ))}
                </ContentsContainer>
            </PageContainer>
        </>
    );
};
