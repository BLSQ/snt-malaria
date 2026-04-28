import React, { FC, useCallback, useEffect, useState } from 'react';
import { Box, Button, Collapse, Typography } from '@mui/material';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';

import InputComponent from 'Iaso/components/forms/InputComponent';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';
import { usePlanningContext } from '../../contexts/PlanningContext';
import { useSaveBudgetAssumptions } from '../../hooks/useSaveBudgetAssumptions';
import { BudgetAssumptions } from '../../types/interventions';

const styles: SxStyles = {
    inputRow: {
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 2,
        marginBottom: 2,
    },
    formWrapper: {
        maxHeight: '100%',
        overflowY: 'auto',
        mb: 2,
        pt: 1,
    },
    yearHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #eee',
        py: 1,
    },
    yearContent: {
        py: 1,
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
    const percentageNumberOptions = { suffix: '%', decimalScale: 0 };
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

    const [openByYear, setOpenByYear] = useState<Record<number, boolean>>({});

    const toggleYear = useCallback((year: number) => {
        setOpenByYear(current => ({ ...current, [year]: !current[year] }));
    }, []);

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
        <Box sx={styles.formWrapper}>
            {years.map(year => {
                const coverage = budgetAssumptionsByYear[year]?.coverage ?? 0;
                return (
                    <Box key={year}>
                        <Box sx={styles.yearHeader}>
                            <Typography variant="subtitle2">{year}</Typography>
                            <Button
                                size="small"
                                variant="text"
                                onClick={() => toggleYear(year)}
                            >
                                {openByYear[year] ? 'Hide' : 'Edit'}
                            </Button>
                        </Box>
                        <Collapse in={!!openByYear[year]}>
                            <Box sx={styles.yearContent}>
                                <Box sx={styles.inputRow}>
                                    <InputComponent
                                        type="number"
                                        keyValue="coverage"
                                        withMarginTop={false}
                                        value={coverage}
                                        onChange={(_, value) =>
                                            setCoverage(year, value)
                                        }
                                        label={
                                            MESSAGES.budgetAssumptionsCoverage
                                        }
                                        numberInputOptions={
                                            percentageNumberOptions
                                        }
                                        disabled={!isScenarioEditable}
                                    />
                                </Box>
                            </Box>
                        </Collapse>
                    </Box>
                );
            })}
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
