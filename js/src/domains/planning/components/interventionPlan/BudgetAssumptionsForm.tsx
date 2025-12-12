import React, { FC, useCallback, useMemo } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import { useFormik } from 'formik';
import * as Yup from 'yup';

import InputComponent from 'Iaso/components/forms/InputComponent';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';
import { useSaveBudgetAssumptions } from '../../hooks/useSaveBudgetAssumptions';
import { Intervention, BudgetAssumptions } from '../../types/interventions';

const styles: SxStyles = {
    inputRow: {
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 2,
        marginBottom: 2,
    },
    inputWrapper: {
        minWidth: '107px',
        width: '107px',
    },
};

type Props = {
    scenarioId: number;
    intervention: Intervention;
    budgetAssumptions: BudgetAssumptions;
};

const interventionCodeValidationSchema = {
    itn_campaign: Yup.object().shape({
        coverage: Yup.number(),
        buffer_mult: Yup.number(),
        divisor: Yup.number(),
        bale_size: Yup.number(),
    }),
    itn_routine: Yup.object().shape({
        coverage: Yup.number(),
        buffer_mult: Yup.number(),
    }),
    iptp: Yup.object().shape({
        coverage: Yup.number(),
        buffer_mult: Yup.number(),
        doses_per_pw: Yup.number(),
    }),
    smc: Yup.object().shape({
        coverage: Yup.number(),
        buffer_mult: Yup.number(),
        pop_prop_3_11: Yup.number(),
        pop_prop_12_59: Yup.number(),
        monthly_rounds: Yup.number(),
    }),
    pmc: Yup.object().shape({
        coverage: Yup.number(),
        buffer_mult: Yup.number(),
        touchpoints: Yup.number(),
        tablet_factor: Yup.number(),
    }),
    vacc: Yup.object().shape({
        coverage: Yup.number(),
        buffer_mult: Yup.number(),
        doses_per_child: Yup.number(),
    }),
};

export const BudgetAssumptionsForm: FC<Props> = ({
    scenarioId,
    intervention,
    budgetAssumptions,
}) => {
    const percentageNumberOptions = { suffix: '%', decimalScale: 0 };
    const { formatMessage } = useSafeIntl();
    const {
        mutateAsync: saveBudgetAssumptions,
        isLoading: isSavingBudgetAssumptions,
    } = useSaveBudgetAssumptions(scenarioId);
    const validationSchema = useMemo(
        () => interventionCodeValidationSchema[intervention.code],
        [intervention],
    );
    const descriptionMessageKey = useMemo(
        () => `budgetAssumptionsDescription_${intervention.code}`,
        [intervention],
    );

    const { values, setFieldValue, isValid, handleSubmit, setFieldTouched } =
        useFormik({
            initialValues: {
                ...budgetAssumptions,
            },
            validationSchema,
            onSubmit: () => {
                saveBudgetAssumptions({
                    budgetAssumptions: values,
                }).then(value => (values.id = value.id));
            },
        });

    const setFieldValueAndState = useCallback(
        (field: string, value: any) => {
            setFieldTouched(field, true);
            setFieldValue(field, value);
        },
        [setFieldTouched, setFieldValue],
    );
    return (
        validationSchema && (
            <>
                <Box>
                    <Box sx={styles.inputRow}>
                        {validationSchema.fields.pop_prop_3_11 && (
                            <InputComponent
                                type="number"
                                keyValue="pop_prop_3_11"
                                withMarginTop={false}
                                min={0}
                                max={100}
                                value={values.pop_prop_3_11}
                                onChange={setFieldValueAndState}
                                label={MESSAGES.budgetAssumptionsPopProp3_11}
                                numberInputOptions={percentageNumberOptions}
                                wrapperSx={styles.inputWrapper}
                            />
                        )}
                        {validationSchema.fields.pop_prop_12_59 && (
                            <InputComponent
                                type="number"
                                keyValue="pop_prop_12_59"
                                withMarginTop={false}
                                min={0}
                                max={100}
                                value={values.pop_prop_12_59}
                                onChange={setFieldValueAndState}
                                label={MESSAGES.budgetAssumptionsPopProp12_59}
                                numberInputOptions={percentageNumberOptions}
                                wrapperSx={styles.inputWrapper}
                            />
                        )}
                        <InputComponent
                            type="number"
                            keyValue="coverage"
                            withMarginTop={false}
                            min={0}
                            max={100}
                            value={values.coverage}
                            onChange={setFieldValueAndState}
                            label={MESSAGES.budgetAssumptionsCoverage}
                            numberInputOptions={percentageNumberOptions}
                            wrapperSx={styles.inputWrapper}
                        />
                        {validationSchema.fields.divisor && (
                            <InputComponent
                                type="number"
                                keyValue="divisor"
                                withMarginTop={false}
                                min={0}
                                max={5}
                                value={values.divisor}
                                onChange={setFieldValueAndState}
                                label={MESSAGES.budgetAssumptionsPPN}
                                numberInputOptions={{ decimalScale: 1 }}
                                wrapperSx={styles.inputWrapper}
                            />
                        )}
                        {validationSchema.fields.touchpoints && (
                            <InputComponent
                                type="number"
                                keyValue="touchpoints"
                                withMarginTop={false}
                                min={0}
                                max={5}
                                value={values.touchpoints}
                                onChange={setFieldValueAndState}
                                label={MESSAGES.budgetAssumptionsTouchpoints}
                                numberInputOptions={{ decimalScale: 0 }}
                                wrapperSx={styles.inputWrapper}
                            />
                        )}
                        {validationSchema.fields.monthly_rounds && (
                            <InputComponent
                                type="number"
                                keyValue="monthly_rounds"
                                withMarginTop={false}
                                min={0}
                                max={31}
                                value={values.monthly_rounds}
                                onChange={setFieldValueAndState}
                                label={MESSAGES.budgetAssumptionsMonthlyRound}
                                numberInputOptions={{ decimalScale: 0 }}
                                wrapperSx={styles.inputWrapper}
                            />
                        )}
                        {validationSchema.fields.bale_size && (
                            <InputComponent
                                type="number"
                                keyValue="bale_size"
                                withMarginTop={false}
                                min={0}
                                max={999}
                                value={values.bale_size}
                                onChange={setFieldValueAndState}
                                label={MESSAGES.budgetAssumptionsBaleSize}
                                numberInputOptions={{ decimalScale: 0 }}
                                wrapperSx={styles.inputWrapper}
                            />
                        )}
                        {validationSchema.fields.doses_per_pw && (
                            <InputComponent
                                type="number"
                                keyValue="doses_per_pw"
                                withMarginTop={false}
                                min={0}
                                max={999}
                                value={values.doses_per_pw}
                                onChange={setFieldValueAndState}
                                label={MESSAGES.budgetAssumptionsDosesPerPW}
                                numberInputOptions={{ decimalScale: 0 }}
                                wrapperSx={styles.inputWrapper}
                            />
                        )}
                        {validationSchema.fields.doses_per_child && (
                            <InputComponent
                                type="number"
                                keyValue="doses_per_child"
                                withMarginTop={false}
                                min={0}
                                max={999}
                                value={values.doses_per_child}
                                onChange={setFieldValueAndState}
                                label={MESSAGES.budgetAssumptionsDosesPerChild}
                                numberInputOptions={{ decimalScale: 0 }}
                                wrapperSx={styles.inputWrapper}
                            />
                        )}
                        {validationSchema.fields.tablet_factor && (
                            <InputComponent
                                type="number"
                                keyValue="tablet_factor"
                                withMarginTop={false}
                                min={0}
                                max={999}
                                value={values.tablet_factor}
                                onChange={setFieldValueAndState}
                                label={MESSAGES.budgetAssumptionsTabletFactor}
                                numberInputOptions={percentageNumberOptions}
                                wrapperSx={styles.inputWrapper}
                            />
                        )}

                        <InputComponent
                            type="number"
                            keyValue="buffer_mult"
                            withMarginTop={false}
                            min={0}
                            max={100}
                            value={values.buffer_mult}
                            onChange={setFieldValueAndState}
                            label={MESSAGES.budgetAssumptionsBuffer}
                            numberInputOptions={percentageNumberOptions}
                            wrapperSx={styles.inputWrapper}
                        />
                    </Box>
                    <Box>
                        <Typography variant="body2" color="text.secondary">
                            {formatMessage(MESSAGES[descriptionMessageKey], {
                                b: chunks => <strong>{chunks}</strong>,
                                li: chunks => <li>{chunks}</li>,
                                ul: chunks => <ul>{chunks}</ul>,
                                br: () => <br />,
                            })}
                        </Typography>
                    </Box>
                </Box>
                <Button
                    onClick={() => handleSubmit()}
                    variant="contained"
                    color="primary"
                    disabled={!isValid && isSavingBudgetAssumptions}
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
            </>
        )
    );
};
