import React, { FC, useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    Divider,
    Grid,
} from '@mui/material';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { InterventionCategories } from './InterventionCategories';
import { InterventionMixSummary } from './InterventionMixSummary';

type Props = {
    scenarioId: number | undefined;
    selectedOrgUnits: OrgUnit[];
};
export const InterventionsMix: FC<Props> = ({
    scenarioId,
    selectedOrgUnits,
}) => {
    const [selectedInterventions, setSelectedInterventions] = useState<{
        [categoryId: number]: number[] | [];
    }>({});
    const [isButtonDisabled, setIsButtonDisabled] = useState<boolean>(false);
    return (
        <Box
            sx={{
                borderRadius: theme => theme.spacing(2),
                overflow: 'hidden',
            }}
        >
            <Card elevation={2}>
                <CardHeader
                    title={
                        <InterventionMixSummary
                            scenarioId={scenarioId}
                            selectedOrgUnits={selectedOrgUnits}
                            selectedInterventions={selectedInterventions}
                            isButtonDisabled={isButtonDisabled}
                            setIsButtonDisabled={setIsButtonDisabled}
                        />
                    }
                />
                <CardContent
                    sx={{
                        padding: 0,
                        '&:last-child': {
                            paddingBottom: 0,
                        },
                    }}
                >
                    <Divider sx={{ width: '100%', mb: 0 }} />
                    <Grid container sx={{ padding: 0 }}>
                        <Grid item xs={5.5}>
                            <Box sx={{ padding: 2 }}>Left Side</Box>
                        </Grid>
                        <Grid item>
                            <Divider
                                orientation="vertical"
                                flexItem
                                sx={{ height: '100%' }}
                            />
                        </Grid>

                        <Grid item xs={5.5}>
                            <InterventionCategories
                                scenarioId={scenarioId}
                                selectedOrgUnits={selectedOrgUnits}
                                selectedInterventions={selectedInterventions}
                                setIsButtonDisabled={setIsButtonDisabled}
                                setSelectedInterventions={
                                    setSelectedInterventions
                                }
                            />
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        </Box>
    );
};
