import React, { FC, useCallback } from 'react';
import { Box, Grid } from '@mui/material';
import { useSafeIntl, useTranslatedErrors } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import {
    LEGEND_TYPE_MAX_ITEMS,
    LEGEND_TYPE_MIN_ITEMS,
} from '../../../../constants/legend';
import { useGetExtendedFormikContext } from '../../../../hooks/useGetExtendedFormikContext';
import { useGetLegendTypes } from '../../../planning/hooks/useGetLegendTypes';
import { MetricTypeFormModel } from '../../../planning/types/metrics';
import { MESSAGES } from '../../messages';
import { LegendConfigForm } from './LegendConfigForm';

type MetricTypeFormProps = {
    metricType?: MetricTypeFormModel;
};

export const MetricTypeForm: FC<MetricTypeFormProps> = ({
    metricType = undefined,
}) => {
    const { formatMessage } = useSafeIntl();
    const { data: legendTypeOptions, isLoading: loadingLegendTypeOptions } =
        useGetLegendTypes();

    const {
        values,
        setFieldValue,
        setChildFieldValueAndState,
        errors,
        touched,
        setFieldTouched,
        addChildValue,
        removeChildValue,
    } = useGetExtendedFormikContext<MetricTypeFormModel>();

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
            <LegendConfigForm
                legendType={values.legend_type}
                legendConfig={values.legend_config || []}
                onAdd={addChildValue}
                onRemove={removeChildValue}
                touched={touched?.legend_config}
                errors={errors?.legend_config}
                onUpdateField={setChildFieldValueAndState}
                minItems={LEGEND_TYPE_MIN_ITEMS[values.legend_type]}
                maxItems={LEGEND_TYPE_MAX_ITEMS[values.legend_type]}
            />
        </Box>
    );
};
