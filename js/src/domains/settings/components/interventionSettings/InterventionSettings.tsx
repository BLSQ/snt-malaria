import React, { useCallback } from 'react';
import { Box, Card, CardContent, CardHeader, Typography } from '@mui/material';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { SxStyles } from 'Iaso/types/general';
import { useGetInterventionCategories } from '../../../planning/hooks/useGetInterventionCategories';
import { Intervention } from '../../../planning/types/interventions';
import { useUpdateInterventionCostBreakdownLines } from '../../hooks/useUpdateInterventionCostBreakdownLines';
import { MESSAGES } from '../../messages';
import { InterventionCostBreakdownLine } from '../../types/InterventionCostBreakdownLine';
import { InterventionCostDrawer } from './InterventionCostDrawer';
import { InterventionRow } from './InterventionRow';

const styles: SxStyles = {
    subtitle: { marginBottom: 0.5, fontWeight: 'bold' },
    cardBody: { position: 'relative', minHeight: '150px' },
    yearSelectWrapper: { marginBottom: 4 },
};

const startYear = 2024;
const yearRange = 5;
const yearOptions = Array.from({ length: yearRange }, (_, i) => {
    const year = startYear + i;
    return {
        label: year.toString(),
        value: year,
    };
});

export const InterventionSettings: React.FC = () => {
    const { formatMessage } = useSafeIntl();

    const [interventionCostDrawerOpen, setInterventionCostDrawerOpen] =
        React.useState<boolean>(false);
    const [selectedIntervention, setSelectedIntervention] =
        React.useState<Intervention | null>(null);
    const [activeYear, setActiveYear] = React.useState<number>(
        new Date().getFullYear() - 1,
    );

    const {
        data: interventionCategories = [],
        isFetching: isLoadingCategories = true,
    } = useGetInterventionCategories();

    const { mutateAsync: updateInterventionCosts } =
        useUpdateInterventionCostBreakdownLines();

    const onUpdateIntervention = useCallback(
        (costs: InterventionCostBreakdownLine[]) => {
            if (!selectedIntervention) return;

            updateInterventionCosts({
                interventionId: selectedIntervention.id,
                year: activeYear,
                costs,
            }).then(() => {
                setInterventionCostDrawerOpen(false);
                setSelectedIntervention(null);
            });
        },
        [
            setInterventionCostDrawerOpen,
            updateInterventionCosts,
            selectedIntervention,
            activeYear,
        ],
    );

    const onEditInterventionCost = useCallback(
        (intervention: Intervention): void => {
            setInterventionCostDrawerOpen(true);
            setSelectedIntervention(intervention);
        },
        [setInterventionCostDrawerOpen, setSelectedIntervention],
    );

    return (
        <>
            <Card>
                <CardHeader
                    title={formatMessage(MESSAGES.interventionsTitle)}
                    subheader={formatMessage(MESSAGES.interventionsSubtitle)}
                    titleTypographyProps={{ variant: 'h6' }}
                    subheaderTypographyProps={{ variant: 'subtitle1' }}
                />
                <CardContent sx={styles.cardBody}>
                    {isLoadingCategories ? (
                        <LoadingSpinner absolute={true} />
                    ) : (
                        <>
                            <Box>
                                <Typography
                                    variant="subtitle2"
                                    color="textPrimary"
                                    mb={1}
                                >
                                    {formatMessage(MESSAGES.selectYear)}
                                </Typography>
                                <InputComponent
                                    type="select"
                                    keyValue="year"
                                    label={formatMessage(MESSAGES.selectYear)}
                                    value={activeYear}
                                    withMarginTop={false}
                                    onChange={(_, value) =>
                                        setActiveYear(
                                            parseInt(value as string, 10),
                                        )
                                    }
                                    options={yearOptions}
                                    wrapperSx={styles.yearSelectWrapper}
                                />
                            </Box>
                            {interventionCategories.map(category => (
                                <Box key={category.id} sx={{ marginBottom: 4 }}>
                                    <Typography
                                        variant="subtitle1"
                                        color="textPrimary"
                                        sx={styles.subtitle}
                                    >
                                        {category.name}
                                    </Typography>
                                    {category.interventions.map(
                                        intervention => (
                                            <InterventionRow
                                                key={intervention.id}
                                                intervention={intervention}
                                                onEditInterventionCost={
                                                    onEditInterventionCost
                                                }
                                            />
                                        ),
                                    )}
                                </Box>
                            ))}
                        </>
                    )}
                </CardContent>
            </Card>
            <InterventionCostDrawer
                open={interventionCostDrawerOpen}
                onClose={() => setInterventionCostDrawerOpen(false)}
                intervention={selectedIntervention}
                year={activeYear}
                onConfirm={onUpdateIntervention}
            />
        </>
    );
};
