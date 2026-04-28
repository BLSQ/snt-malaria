import React, { FC, useCallback, useEffect, useState } from 'react';
import { Box, Button } from '@mui/material';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';

import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';
import { usePlanningContext } from '../../contexts/PlanningContext';
import { useSaveBudgetAssumptions } from '../../hooks/useSaveBudgetAssumptions';
import { BudgetAssumptions } from '../../types/interventions';
import { YearCoverage } from './YearCoverage';

const styles: SxStyles = {
    contentWrapper: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
    },
    formWrapper: {
        maxHeight: '100%',
        overflowY: 'auto',
        mb: 2,
    },
};

type Props = {
    scenarioId: number;
    years: number[];
    interventionAssignmentIds: number[];
    budgetAssumptions: BudgetAssumptions[];
};

export const BudgetAssumptionsForm: FC<Props> = ({
    scenarioId,
    years,
    interventionAssignmentIds,
    budgetAssumptions,
}) => {
    const { isScenarioEditable } = usePlanningContext();
    const { formatMessage } = useSafeIntl();
    const {
        mutateAsync: saveBudgetAssumptions,
        isLoading: isSavingBudgetAssumptions,
    } = useSaveBudgetAssumptions(scenarioId);

    const [budgetAssumptionsByYear, setBudgetAssumptionsByYear] = useState<
        Record<number, BudgetAssumptions>
    >({});

    useEffect(() => {
        const assumptionsByYear = (budgetAssumptions || []).reduce(
            (acc, assumption) => {
                if (assumption.year) {
                    acc[assumption.year] = assumption;
                }
                return acc;
            },
            {} as Record<number, BudgetAssumptions>,
        );
        setBudgetAssumptionsByYear(assumptionsByYear);
    }, [budgetAssumptions]);

    const setCoverage = useCallback(
        (year: number, value: any) => {
            setBudgetAssumptionsByYear(current => ({
                ...current,
                [year]: {
                    ...current[year],
                    year: year,
                    coverage: Number(value ?? 0),
                },
            }));
        },
        [setBudgetAssumptionsByYear],
    );

    return (
        <Box sx={styles.contentWrapper}>
            <Box sx={styles.formWrapper}>
                {years.map(year => (
                    <YearCoverage
                        key={year}
                        year={year}
                        budgetAssumptions={
                            budgetAssumptionsByYear[year] || { year }
                        }
                        setCoverage={setCoverage}
                        disabled={!isScenarioEditable}
                    />
                ))}
            </Box>

            {isScenarioEditable && (
                <Button
                    onClick={() =>
                        saveBudgetAssumptions({
                            budgetAssumptions: Object.values(
                                budgetAssumptionsByYear,
                            ),
                            interventionAssignmentIds,
                        })
                    }
                    variant="contained"
                    color="primary"
                    disabled={isSavingBudgetAssumptions}
                >
                    {formatMessage(MESSAGES.budgetAssumptionsSave)}
                    {isSavingBudgetAssumptions && (
                        <LoadingSpinner
                            size={16}
                            absolute
                            fixed={false}
                            transparent
                        />
                    )}
                </Button>
            )}
        </Box>
    );
};
