import React, { FC, useCallback, useEffect, useMemo } from 'react';
import { Box, Grid } from '@mui/material';
import { useSafeIntl, useTranslatedErrors } from 'bluesquare-components';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useGetLegendTypes } from '../../../planning/hooks/useGetLegendTypes';
import { MetricTypeFormModel } from '../../../planning/types/metrics';
import { MESSAGES } from '../../messages';

type MetricTypeFormProps = {
    metricType?: MetricTypeFormModel;
    onSubmitFormRef: (callback: () => void) => void;
    onSubmit: (metricType: MetricTypeFormModel) => void;
};

const DEFAULT_METRIC_TYPE: MetricTypeFormModel = {
    id: undefined,
    name: '',
    description: '',
    origin: 'custom',
    category: '',
    code: '',
    source: '',
    units: '',
    unit_symbol: '',
    comments: '',
    scale: '',
    legend_type: '',
};

export const MetricTypeForm: FC<MetricTypeFormProps> = ({
    metricType = undefined,
    onSubmitFormRef,
    onSubmit,
}) => {
    const { formatMessage } = useSafeIntl();
    const { data: legendTypeOptions, isLoading: loadingLegendTypeOptions } =
        useGetLegendTypes();

    const validationSchema = useMemo(
        () =>
            Yup.object().shape({
                code: Yup.string()
                    .required(formatMessage(MESSAGES.required))
                    .matches(/^\S*$/, formatMessage(MESSAGES.noWhitespace)),
                name: Yup.string().required(formatMessage(MESSAGES.required)),
                description: Yup.string(),
                category: Yup.string().required(
                    formatMessage(MESSAGES.required),
                ),
                units: Yup.string(),
                unit_symbol: Yup.string().max(
                    2,
                    formatMessage(MESSAGES.maxLength, { max: 2 }),
                ),
                legend_type: Yup.string().required(
                    formatMessage(MESSAGES.required),
                ),
                scale: Yup.string()
                    .required(formatMessage(MESSAGES.required))
                    .trim()
                    .matches(
                        /^\[\s*([a-zA-Z0-9_.-]+(\s*,\s*[a-zA-Z0-9_.-]+)*)?\s*\]$/,
                        formatMessage(MESSAGES.invalidJsonArray),
                    )
                    .test(
                        'scale length',
                        formatMessage(MESSAGES.scaleItemsCount),
                        (value, testContext) => {
                            if (!value) return false;
                            const cleanedValue = value.replaceAll(' ', '');
                            const count = cleanedValue
                                .substring(1, cleanedValue.length - 1)
                                .split(',').length;

                            switch (testContext.parent.legend_type) {
                                case 'ordinal':
                                    return count >= 2 && count <= 4;
                                case 'threshold':
                                    return count >= 2 && count <= 9;
                                case 'linear':
                                    return count === 2;
                                default:
                                    return false;
                            }
                        },
                    ),
            }),
        [formatMessage],
    );

    const {
        values,
        setFieldValue,
        handleSubmit,
        errors,
        touched,
        setFieldTouched,
    } = useFormik({
        initialValues: metricType || DEFAULT_METRIC_TYPE,
        validationSchema,
        validateOnBlur: true,
        onSubmit: () => onSubmit(values),
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
        touched,
        formatMessage,
        messages: MESSAGES,
    });

    useEffect(() => {
        onSubmitFormRef(handleSubmit);
    }, [handleSubmit, onSubmitFormRef]);

    return (
        <Box>
            <InputComponent
                keyValue="code"
                onChange={setFieldValueAndState}
                value={values.code}
                type="text"
                label={MESSAGES.variable}
                required
                errors={getErrors('code')}
                disabled={!!metricType?.id}
            />
            <InputComponent
                keyValue="name"
                onChange={setFieldValueAndState}
                value={values.name}
                type="text"
                label={MESSAGES.label}
                required
                errors={getErrors('name')}
            />
            <InputComponent
                keyValue="category"
                onChange={setFieldValueAndState}
                value={values.category}
                type="text"
                label={MESSAGES.category}
                required
                errors={getErrors('category')}
            />
            <InputComponent
                keyValue="description"
                onChange={setFieldValueAndState}
                value={values.description}
                type="textarea"
                label={MESSAGES.description}
                errors={getErrors('description')}
            />
            <InputComponent
                keyValue="units"
                onChange={setFieldValueAndState}
                value={values.units}
                type="text"
                label={MESSAGES.units}
                errors={getErrors('units')}
            />
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <InputComponent
                        type="select"
                        keyValue="legend_type"
                        multi={false}
                        wrapperSx={{ flexGrow: 1 }}
                        clearable={false}
                        options={legendTypeOptions || []}
                        value={values.legend_type}
                        onChange={setFieldValueAndState}
                        label={MESSAGES.legendType}
                        errors={getErrors('legend_type')}
                        loading={loadingLegendTypeOptions}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <InputComponent
                        keyValue="unit_symbol"
                        onChange={setFieldValueAndState}
                        value={values.unit_symbol}
                        type="text"
                        label={MESSAGES.unitSymbol}
                        errors={getErrors('unit_symbol')}
                    />
                </Grid>
            </Grid>
            <InputComponent
                keyValue="scale"
                onChange={setFieldValueAndState}
                value={values.scale}
                type="text"
                label={MESSAGES.scale}
                required
                errors={getErrors('scale')}
            />
        </Box>
    );
};
