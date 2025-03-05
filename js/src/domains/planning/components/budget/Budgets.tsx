import React, { FC, useMemo } from 'react';
import AdjustIcon from '@mui/icons-material/Adjust';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
    Box,
    Typography,
    Accordion,
    AccordionSummary,
    Stack,
    Theme,
    Grid,
    AccordionDetails,
    // AccordionDetails,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { UseGetBudgets } from '../../hooks/UseGetBudgets';
import { MESSAGES } from '../../messages';
import { containerBoxStyles } from '../styles';
import { BudgetsTable } from './BudgetsTable';

const styles: SxStyles = {
    icon: (theme: Theme) => ({
        color: theme.palette.primary.main,
        height: 'auto',
    }),
};
type Props = {
    scenarioId: number | undefined;
};
export const Budgets: FC<Props> = ({ scenarioId }) => {
    const { formatMessage } = useSafeIntl();
    const { data: budgets, isLoading: isLoadingBudgets } =
        UseGetBudgets(scenarioId);

    const totalBudget = useMemo(() => {
        let total: number | undefined = 0;
        if (!isLoadingBudgets) {
            total = budgets?.reduce((sum, org) => sum + org.budget, 0);
        }
        return total;
    }, [budgets, isLoadingBudgets]);
    return (
        <Box
            sx={{
                mt: 2,
                borderRadius: theme => theme.spacing(2),
                overflow: 'hidden',
            }}
        >
            <Accordion
                sx={{
                    '&:before': {
                        display: 'none',
                    },
                }}
            >
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="interventions-content"
                    id="interventions-header"
                >
                    <Grid
                        container
                        direction="row"
                        spacing={2}
                        alignItems="center"
                        justifyContent="space-between"
                    >
                        <Grid item sx={{ flexGrow: 1 }}>
                            <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                            >
                                <Box sx={containerBoxStyles}>
                                    <AdjustIcon sx={styles.icon} />
                                </Box>

                                <Typography
                                    variant="h6"
                                    gutterBottom
                                    color="#1F2B3D"
                                >
                                    {formatMessage(
                                        MESSAGES.interventionPlanTitle,
                                    )}
                                </Typography>
                            </Stack>
                        </Grid>
                        <Grid item sx={{ mr: 4 }}>
                            <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                                sx={{ color: '#1F2B3D99' }}
                            >
                                <Typography variant="h6">
                                    {new Intl.NumberFormat('en-US', {
                                        style: 'currency',
                                        currency: 'USD',
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 0,
                                    }).format(totalBudget ?? 0)}
                                </Typography>
                            </Stack>
                        </Grid>
                    </Grid>
                </AccordionSummary>
                <AccordionDetails sx={{ padding: 2 }}>
                    <BudgetsTable
                        isLoadingBudgets={isLoadingBudgets}
                        budgets={budgets}
                    />
                </AccordionDetails>
                {/* <AccordionDetails> */}
                {/* <Box p={2}>Add content for BUDGETS here</Box> */}
                {/* </AccordionDetails> */}
            </Accordion>
        </Box>
    );
};
