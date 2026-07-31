import { useMemo } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
    isConcreteLegend,
    LEGEND_TYPE_MAX_ITEMS,
    LEGEND_TYPE_MIN_ITEMS,
    LegendTypes,
} from '../../../constants/legend';
import { MESSAGES } from '../messages';
import { MetricTypeFormModel } from '../types/metrics';

export const DEFAULT_LEGEND_CONFIG_ITEM = {
    color: '#000000',
    value: '',
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
    legend_type: LegendTypes.THRESHOLD,
    legend_config: [DEFAULT_LEGEND_CONFIG_ITEM, DEFAULT_LEGEND_CONFIG_ITEM],
    is_composite: false,
};

const useValidationSchema = () => {
    const { formatMessage } = useSafeIntl();

    return useMemo(
        () =>
            Yup.object().shape({
                // Composites get an auto-generated data key server-side.
                code: Yup.string().when('is_composite', {
                    is: true,
                    then: schema => schema.notRequired(),
                    otherwise: schema =>
                        schema
                            .required(formatMessage(MESSAGES.required))
                            .matches(
                                /^\S*$/,
                                formatMessage(MESSAGES.noWhitespace),
                            ),
                }),
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
                // auto/reference buckets are computed server-side.
                legend_config: Yup.array().when('legend_type', {
                    is: (legendType: string) => !isConcreteLegend(legendType),
                    then: schema => schema.notRequired(),
                    otherwise: schema =>
                        schema
                            .of(
                                Yup.object().shape({
                                    value: Yup.mixed().required(
                                        formatMessage(MESSAGES.required),
                                    ),

                                    color: Yup.string()
                                        .matches(
                                            /^#([0-9A-F]{3}){1,2}$/i,
                                            formatMessage(MESSAGES.invalidColor),
                                        )
                                        .required(
                                            formatMessage(MESSAGES.required),
                                        ),
                                }),
                            )
                            .required(formatMessage(MESSAGES.required))
                            .test(
                                'scale length',
                                formatMessage(MESSAGES.scaleItemsCount),
                                (value, testContext) => {
                                    if (!value) return false;
                                    const count = value.length;

                                    const maxItems =
                                        LEGEND_TYPE_MAX_ITEMS[
                                            testContext.parent.legend_type
                                        ];
                                    const minItems =
                                        LEGEND_TYPE_MIN_ITEMS[
                                            testContext.parent.legend_type
                                        ];

                                    return maxItems && minItems
                                        ? count >= minItems && count <= maxItems
                                        : false;
                                },
                            )
                            .test(
                                'unique values',
                                formatMessage(MESSAGES.scaleItemsUnique),
                                value => {
                                    if (!value) return false;
                                    const values = value.map(
                                        (item: any) => item.value,
                                    );
                                    return (
                                        new Set(values).size === values.length
                                    );
                                },
                            ),
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
        enableReinitialize: true,
        validationSchema,
        validateOnMount: true,
        validateOnBlur: true,
        onSubmit: values => onSubmit(values),
    });
};
