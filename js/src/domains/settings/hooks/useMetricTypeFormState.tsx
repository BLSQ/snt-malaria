import { useMemo } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { LegendTypes } from '../../../constants/legend';
import { MetricTypeFormModel } from '../../planning/types/metrics';
import { MESSAGES } from '../messages';

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
    legend_type: '',
    legend_config: [],
};

export const DEFAULT_LEGEND_CONFIG_ITEM = {
    color: '#000000',
    value: '',
};

const useValidationSchema = () => {
    const { formatMessage } = useSafeIntl();

    return useMemo(
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
                legend_config: Yup.array().when('legend_type', {
                    is: (val: string) =>
                        val === LegendTypes.ORDINAL ||
                        val === LegendTypes.THRESHOLD ||
                        val === LegendTypes.LINEAR,
                    then: schema =>
                        schema.required(formatMessage(MESSAGES.required)),
                    otherwise: schema => schema.notRequired(),
                    // TODO Test scale length
                    // TODO Test scale value
                    // TODO Test scale color
                }),
            }),
        [formatMessage],
    );
};

export const useMetricTypeFormState = (
    initialValue: MetricTypeFormModel | undefined,
    onSubmit: (values: MetricTypeFormModel) => void,
) => {
    const validationSchema = useValidationSchema();
    return useFormik({
        initialValues: initialValue || DEFAULT_METRIC_TYPE,
        validationSchema,
        validateOnBlur: true,
        onSubmit: values => onSubmit(values),
    });
};
