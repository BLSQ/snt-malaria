import React, { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Theme } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import TopBar from 'Iaso/components/nav/TopBarComponent';
import { SxStyles } from 'Iaso/types/general';
import {
    ContentsContainer,
    PageContainer,
} from '../../components/styledComponents';

import { baseUrls } from '../../constants/urls';
import { ScenarioComponent } from './components/ScenarioComponent';
import { useCreateScenario, useGetScenarios } from './hooks/useGetScenarios';
import { MESSAGES } from './messages';
import { Scenario } from './types';

const styles: SxStyles = {
    buttonsBox: (theme: Theme) => ({
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'right',
        width: '100%',
        marginBottom: theme.spacing(4),
    }),
    button: {
        color: 'white',
        fontSize: '0.875rem',
        fontWeight: 'bold',
        textTransform: 'none',
    },
};

export const Scenarios: FC = () => {
    const { formatMessage } = useSafeIntl();
    const navigate = useNavigate();
    const { data: scenarios, isLoading } = useGetScenarios();

    const { mutateAsync: createScenario, isLoading: isLoadingCreateScenario } =
        useCreateScenario();

    const handleCreateScenario = async () => {
        const scenario = await createScenario();
        navigate(`/${baseUrls.planning}/scenarioId/${scenario.id}`);
    };

    return (
        <>
            <TopBar title={formatMessage(MESSAGES.title)} disableShadow />
            <PageContainer>
                <ContentsContainer>
                    <Box sx={styles.buttonsBox}>
                        <div>{/* empty div for styling purposes */}</div>
                        <Button
                            sx={styles.button}
                            variant="contained"
                            color="primary"
                            size="small"
                            onClick={handleCreateScenario}
                            disabled={isLoadingCreateScenario}
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
