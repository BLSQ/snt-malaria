import React, { FC, useCallback, useMemo } from 'react';
import { Box, Button, Divider } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { useFormik } from 'formik';
import * as Yup from 'yup';

import InputComponent from 'Iaso/components/forms/InputComponent';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';
import {
    Intervention,
    InterventionBudgetSettings,
} from '../../types/interventions';

const styles: SxStyles = {
    actions: {
        display: 'flex',
        justifyContent: 'flex-end',
        padding: 4,
    },
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
    intervention: Intervention;
    budgetSettings: InterventionBudgetSettings;
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
        doses_per_child: Yup.number(), // TODO
    }),
};

const percentageFields = [
    'coverage',
    'tablet_factor',
    'pop_prop_3_11',
    'pop_prop_12_59',
];

export const InterventionBudgetSettingsForm: FC<Props> = ({
    intervention,
    budgetSettings,
}) => {
    const { formatMessage } = useSafeIntl();

    const validationSchema = useMemo(
        () => interventionCodeValidationSchema[intervention.code],
        [intervention],
    );

    const percentageNumberOptions = { suffix: '%', decimalScale: 0 };

    const {
        values,
        setFieldValue,
        isValid,
        handleSubmit,
        errors,
        touched,
        setFieldTouched,
    } = useFormik({
        // TODO Default coverage depends on intervention type.
        // TODO Transform percentage * 100 and (buffer_multi - 1) * 100
        initialValues: {
            ...budgetSettings,
        },
        validationSchema,
        onSubmit: () => {
            const costOverrides = Object.entries(values).reduce(
                (acc, [key, value]) => {
                    let newValue = value;
                    if (percentageFields.includes(key)) {
                        newValue = value / 100;
                    }

                    if (key === 'buffer_mult') {
                        newValue = 1 + value / 100;
                    }

                    return { ...acc, [key]: newValue };
                },
                {} as any,
            );

            costOverrides.age_string = `${costOverrides.pop_prop_3_11}, ${costOverrides.pop_prop_12_59}`;
            console.log('on submit', costOverrides);
        },
        // TODO Transform :
        // Add anc for iptp_coverage => iptp_anc_coverage
        // age_string:
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
                            label={MESSAGES.budgetSettingsPopProp3_11}
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
                            label={MESSAGES.budgetSettingsPopProp12_59}
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
                        label={MESSAGES.budgetSettingsCoverage}
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
                            label={MESSAGES.budgetSettingsPPN}
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
                            label={MESSAGES.budgetSettingsTouchpoints}
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
                            label={MESSAGES.budgetSettingsMonthlyRound}
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
                            label={MESSAGES.budgetSettingsBaleSize}
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
                            label={MESSAGES.budgetSettingsDosesPerPW}
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
                            label={MESSAGES.budgetSettingsDosesPerChild}
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
                            label={MESSAGES.budgetSettingsTabletFactor}
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
                        label={MESSAGES.budgetSettingsBuffer}
                        numberInputOptions={percentageNumberOptions}
                        wrapperSx={styles.inputWrapper}
                    />
                </Box>
                <Divider />
                <Box sx={styles.actions}>
                    <Button
                        onClick={() => handleSubmit()}
                        disabled={!isValid}
                        variant="contained"
                        color="primary"
                    >
                        {formatMessage(MESSAGES.budgetSettingsSave)}
                    </Button>
                </Box>
            </>
        )
    );
};
