import React, { useCallback, useMemo } from 'react';
import { Box, Divider, Button } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../messages';
import { InterventionCostBreakdownLine } from '../../types/InterventionCostBreakdownLine';
import { InterventionCostBreakdownLinesForm } from './InterventionCostBreakdownLinesForm';

type Props = {
    defaultValues: {
        cost_breakdown_lines: InterventionCostBreakdownLine[];
    };
    year: number;
    onConfirm: (data: { cost_breakdown_lines: any[] }) => void;
};

const DEFAULT_COST_LINE = {
    name: '',
    category: undefined,
    unit_cost: 0,
    id: 0,
    year: new Date().getFullYear(),
};

const styles: SxStyles = {
    formWrapper: {
        flexGrow: 1,
        overflow: 'hidden',
    },
    form: {
        padding: 4,
        height: '100%',
        overflow: 'auto',
    },
    formControl: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        alignItems: 'start',
        '> .MuiTypography-root': {
            paddingTop: 1,
        },
    },
    formControlSmall: {
        '> .MuiBox-root': {
            maxWidth: '95px',
        },
    },
    costControlWrapper: {
        maxWidth: '95px',
        marginLeft: 'auto',
        display: 'flex',
        alignItems: 'center',
    },
    inputLabel: {
        marginBottom: 1,
    },
    actions: {
        display: 'flex',
        justifyContent: 'flex-end',
        padding: 4,
    },
};

export const InterventionCostForm: React.FC<Props> = ({
    year,
    defaultValues = {
        cost_breakdown_lines: [],
    },
    onConfirm,
}) => {
    const { formatMessage } = useSafeIntl();

    const validationSchema = useMemo(
        () =>
            Yup.object().shape({
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
                    }),
                ),
            }),
        [formatMessage],
    );

    const {
        values,
        setFieldValue,
        // setFieldError,
        isValid,
        handleSubmit,
        errors,
        touched,
        setFieldTouched,
    } = useFormik({
        initialValues: defaultValues,
        validationSchema,
        onSubmit: () =>
            onConfirm({
                cost_breakdown_lines: values.cost_breakdown_lines ?? [],
            }),
    });

    const onTotalCostChanges = useCallback(
        (totalCost: number) => {
            setFieldValue('unit_cost', totalCost);
        },
        [setFieldValue],
    );

    const setFieldValueAndState = useCallback(
        (field: string, value: any) => {
            setFieldTouched(field, true);
            setFieldValue(field, value);
        },
        [setFieldTouched, setFieldValue],
    );

    const onAddCostItem = useCallback(() => {
        const newCostItems = [
            ...values.cost_breakdown_lines,
            { ...DEFAULT_COST_LINE, year },
        ];
        setFieldValue('cost_breakdown_lines', newCostItems);
    }, [values, setFieldValue, year]);

    const onRemoveCostItem = useCallback(
        (index: number) => {
            const newCostItems = [...values.cost_breakdown_lines];
            newCostItems.splice(index, 1);
            setFieldValue('cost_breakdown_lines', newCostItems);
        },
        [values, setFieldValue],
    );

    return (
        <>
            <Box sx={styles.formWrapper}>
                <Box
                    component="form"
                    noValidate
                    autoComplete="off"
                    sx={styles.form}
                >
                    <InterventionCostBreakdownLinesForm
                        costBreakdownLines={values.cost_breakdown_lines}
                        onUpdateField={setFieldValueAndState}
                        onAddInterventionCostBreakdownLine={onAddCostItem}
                        onRemoveInterventionCostBreakdownLine={onRemoveCostItem}
                        onTotalCostChanges={onTotalCostChanges}
                        errors={errors.cost_breakdown_lines}
                        touched={touched.cost_breakdown_lines}
                    />
                </Box>
            </Box>
            <Divider />
            <Box sx={styles.actions}>
                <Button
                    onClick={() => handleSubmit()}
                    disabled={!isValid}
                    variant="contained"
                    color="primary"
                >
                    {formatMessage(MESSAGES.save)}
                </Button>
            </Box>
        </>
    );
};
