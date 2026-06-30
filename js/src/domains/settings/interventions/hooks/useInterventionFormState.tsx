import { useMemo } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { FormikHelpers, useFormik } from 'formik';
import * as Yup from 'yup';
import { InterventionCostUnitTypeOption } from '../../../interventions/hooks/useGetInterventionCostUnitType';
import { MESSAGES } from '../../../messages';

const defaultInterventionValues = {
    id: undefined,
    name: '',
    impact_ref: '',
    grant: null,
    cost_breakdown_lines: [],
};

const useValidation = (
    costUnitTypesById: Record<string, InterventionCostUnitTypeOption>,
) => {
    const { formatMessage } = useSafeIntl();

    return useMemo(
        () =>
            Yup.object().shape({
                name: Yup.string()
                    .required(formatMessage(MESSAGES.required))
                    .max(255, formatMessage(MESSAGES.maxLength, { max: 255 })),
                impact_ref: Yup.string(),
                grant: Yup.number().nullable(),
                cost_breakdown_lines: Yup.array().of(
                    Yup.object().shape({
                        name: Yup.string().required(
                            formatMessage(MESSAGES.required),
                        ),
                        unit_cost: Yup.number()
                            .required(formatMessage(MESSAGES.required))
                            .min(
                                0,
                                formatMessage(MESSAGES.negativeValueNotAllowed),
                            ),
                        category: Yup.string().required(
                            formatMessage(MESSAGES.required),
                        ),
                        unit_type: Yup.string().required(
                            formatMessage(MESSAGES.required),
                        ),
                        population_layer: Yup.number()
                            .nullable()
                            .when('unit_type', {
                                is: (unitType: string | undefined) => {
                                    if (!unitType) {
                                        return false;
                                    }
                                    const option =
                                        costUnitTypesById[String(unitType)];
                                    // Default to proportional when the option metadata is not
                                    // yet known to avoid false negatives on first render.
                                    return option
                                        ? option.is_proportional
                                        : true;
                                },
                                then: schema =>
                                    schema.required(
                                        formatMessage(MESSAGES.required),
                                    ),
                                otherwise: schema => schema.notRequired(),
                            }),
                    }),
                ),
            }),
        [formatMessage, costUnitTypesById],
    );
};

export const useInterventionFormState = ({
    onSubmit,
    initialValues,
    costUnitTypesById = {},
}: {
    onSubmit: (
        values: Partial<any>,
        formikHelpers?: FormikHelpers<any>,
    ) => void;
    initialValues?: any;
    editMode?: boolean;
    costUnitTypesById?: Record<string, InterventionCostUnitTypeOption>;
}) => {
    const validationSchema = useValidation(costUnitTypesById);
    const formik = useFormik({
        initialValues: initialValues ?? defaultInterventionValues,
        validationSchema,
        onSubmit,
    });

    return { ...formik };
};
