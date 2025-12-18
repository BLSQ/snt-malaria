import React, { FC, useCallback, useMemo } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import { useFormik } from 'formik';
import * as Yup from 'yup';

import InputComponent from 'Iaso/components/forms/InputComponent';
import { useTranslatedErrors } from 'Iaso/libs/validation';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';
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
    inputWrapper: {
        minWidth: '99px',
        width: '99px',
    },
};

type Props = {
    scenarioId: number;
    budgetAssumptions: BudgetAssumptions;
};

export const BudgetAssumptionsForm: FC<Props> = ({
    scenarioId,
    budgetAssumptions,
}) => {
    const percentageNumberOptions = { suffix: '%', decimalScale: 0 };
    const { formatMessage } = useSafeIntl();
    const {
        mutateAsync: saveBudgetAssumptions,
        isLoading: isSavingBudgetAssumptions,
    } = useSaveBudgetAssumptions(scenarioId);

    const descriptionMessageKey = `budgetAssumptionsDescription_${budgetAssumptions.intervention_code}`;
    const getMinMessage = useCallback(
        (min: number) =>
            formatMessage(MESSAGES.budgetAssumptionsMinValue, { min }),
        [formatMessage],
    );
    const getMaxMessage = useCallback(
        (max: number) =>
            formatMessage(MESSAGES.budgetAssumptionsMaxValue, { max }),
        [formatMessage],
    );
    const validationSchema = useMemo(() => {
        switch (budgetAssumptions.intervention_code) {
            case 'itn_campaign':
                return Yup.object().shape({
                    coverage: Yup.number()
                        .min(0, getMinMessage(0))
                        .max(100, getMaxMessage(100)),
                    buffer_mult: Yup.number()
                        .min(0, getMinMessage(0))
                        .max(100, getMaxMessage(100)),
                    divisor: Yup.number()
                        .min(0, getMinMessage(0))
                        .max(9, getMaxMessage(9)),
                    bale_size: Yup.number()
                        .min(0, getMinMessage(0))
                        .max(999, getMaxMessage(999)),
                });
            case 'itn_routine':
                return Yup.object().shape({
                    coverage: Yup.number()
                        .min(0, getMinMessage(0))
                        .max(100, getMaxMessage(100)),
                    buffer_mult: Yup.number()
                        .min(0, getMinMessage(0))
                        .max(100, getMaxMessage(100)),
                });
            case 'iptp':
                return Yup.object().shape({
                    coverage: Yup.number()
                        .min(0, getMinMessage(0))
                        .max(100, getMaxMessage(100)),
                    buffer_mult: Yup.number()
                        .min(0, getMinMessage(0))
                        .max(100, getMaxMessage(100)),
                    doses_per_pw: Yup.number()
                        .min(0, getMinMessage(0))
                        .max(999, getMaxMessage(999)),
                });
            case 'smc':
                return Yup.object().shape({
                    coverage: Yup.number()
                        .min(0, getMinMessage(0))
                        .max(100, getMaxMessage(100)),
                    buffer_mult: Yup.number()
                        .min(0, getMinMessage(0))
                        .max(100, getMaxMessage(100)),
                    pop_prop_3_11: Yup.number()
                        .min(0, getMinMessage(0))
                        .max(100, getMaxMessage(100)),
                    pop_prop_12_59: Yup.number()
                        .min(0, getMinMessage(0))
                        .max(100, getMaxMessage(100)),
                    monthly_rounds: Yup.number()
                        .min(0, getMinMessage(0))
                        .max(32, getMaxMessage(32)),
                });
            case 'pmc':
                return Yup.object().shape({
                    coverage: Yup.number()
                        .min(0, getMinMessage(0))
                        .max(100, getMaxMessage(100)),
                    buffer_mult: Yup.number()
                        .min(0, getMinMessage(0))
                        .max(100, getMaxMessage(100)),
                    touchpoints: Yup.number()
                        .min(0, getMinMessage(0))
                        .max(999, getMaxMessage(999)),
                    tablet_factor: Yup.number()
                        .min(0, getMinMessage(0))
                        .max(100, getMaxMessage(100)),
                });
            case 'vacc':
                return Yup.object().shape({
                    coverage: Yup.number()
                        .min(0, getMinMessage(0))
                        .max(100, getMaxMessage(100)),
                    buffer_mult: Yup.number()
                        .min(0, getMinMessage(0))
                        .max(100, getMaxMessage(100)),
                    doses_per_child: Yup.number()
                        .min(0, getMinMessage(0))
                        .max(999, getMaxMessage(999)),
                });
            default:
                return null;
        }
    }, [budgetAssumptions, getMinMessage, getMaxMessage]);

    const {
        values,
        setFieldValue,
        isValid,
        handleSubmit,
        setFieldTouched,
        errors,
        touched,
    } = useFormik({
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

    const getErrors = useTranslatedErrors({
        errors,
        formatMessage,
        touched,
        messages: MESSAGES,
    });
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
                                errors={getErrors('pop_prop_3_11')}
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
                                errors={getErrors('pop_prop_12_59')}
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
                            errors={getErrors('coverage')}
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
                                errors={getErrors('divisor')}
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
                                errors={getErrors('touchpoints')}
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
                                errors={getErrors('monthly_rounds')}
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
                                errors={getErrors('bale_size')}
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
                                errors={getErrors('doses_per_pw')}
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
                                errors={getErrors('doses_per_child')}
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
                                errors={getErrors('tablet_factor')}
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
                            errors={getErrors('buffer_mult')}
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
                    disabled={!isValid || isSavingBudgetAssumptions}
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
