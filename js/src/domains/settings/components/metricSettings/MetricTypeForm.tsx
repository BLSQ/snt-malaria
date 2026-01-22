import React, { FC, useCallback, useEffect, useMemo } from 'react';
import { Box, Grid } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useGetLegendTypes } from '../../../planning/hooks/useGetLegendTypes';
import { MetricTypeFormModel } from '../../../planning/types/metrics';
import { MESSAGES } from '../../messages';

type MetricTypeFormProps = {
    metricType?: MetricTypeFormModel;
    onSubmitFormRef: (callback: () => void) => void;
    onSubmit?: (metricType: MetricTypeFormModel) => void;
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
                code: Yup.string().required(formatMessage(MESSAGES.required)),
                name: Yup.string().required(formatMessage(MESSAGES.required)),
                description: Yup.string(),
                category: Yup.string().required(
                    formatMessage(MESSAGES.required),
                ),
                units: Yup.string(),
                unit_symbol: Yup.string(),
                legend_type: Yup.string().required(
                    formatMessage(MESSAGES.required),
                ),
                scale: Yup.string()
                    .trim()
                    // TODO Validate max scale items length?
                    // TODO All scale types
                    .matches(
                        /^\[(\s*(\d+|"[^"]*")\s*,)*\s*(\d+|"[^"]*")\s*\]$|^\[\s*\]$/,
                        formatMessage(MESSAGES.invalidJsonArray),
                    ),
            }),
        [formatMessage],
    );

    const { values, setFieldValue, handleSubmit, errors, setFieldTouched } =
        useFormik({
            initialValues: metricType || DEFAULT_METRIC_TYPE,
            validationSchema,
            onSubmit: () => {
                if (onSubmit) {
                    onSubmit(values);
                }
            },
        });

    const setFieldValueAndState = useCallback(
        (field: string, value: any) => {
            setFieldTouched(field, true);
            setFieldValue(field, value);
        },
        [setFieldTouched, setFieldValue],
    );

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
                errors={errors.code ? [errors.code] : []}
            />
            <InputComponent
                keyValue="name"
                onChange={setFieldValueAndState}
                value={values.name}
                type="text"
                label={MESSAGES.label}
                required
                errors={errors.name ? [errors.name] : []}
            />
            <InputComponent
                keyValue="category"
                onChange={setFieldValueAndState}
                value={values.category}
                type="text"
                label={MESSAGES.category}
                required
                errors={errors.category ? [errors.category] : []}
            />
            <InputComponent
                keyValue="description"
                onChange={setFieldValueAndState}
                value={values.description}
                type="textarea"
                label={MESSAGES.description}
                errors={errors.description ? [errors.description] : []}
            />
            <InputComponent
                keyValue="units"
                onChange={setFieldValueAndState}
                value={values.units}
                type="text"
                label={MESSAGES.units}
                errors={errors.units ? [errors.units] : []}
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
                        errors={errors.legend_type ? [errors.legend_type] : []}
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
                        errors={errors.unit_symbol ? [errors.unit_symbol] : []}
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
                errors={errors.scale ? [errors.scale] : []}
            />
        </Box>
    );
};
