import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    FormControl,
    Box,
    Typography,
    Divider,
    Button,
    Switch,
    FormControlLabel,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useTranslatedErrors } from 'Iaso/libs/validation';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../messages';
import { InterventionCostBreakdownLine } from '../../types/InterventionCostBreakdownLine';
import { InterventionCostBreakdownLinesForm } from './InterventionCostBreakdownLinesForm';

type Props = {
    defaultValues: {
        unit_type?: string;
        unit_cost?: number;
        cost_breakdown_lines: InterventionCostBreakdownLine[];
    };
    onConfirm: (data: {
        unit_type: string;
        unit_cost: number;
        cost_breakdown_lines: any[];
    }) => void;
};

const DEFAULT_COST_LINE = {
    name: '',
    category: undefined,
    unit_cost: 0,
    id: 0,
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
    defaultValues = {
        unit_type: undefined,
        unit_cost: undefined,
        cost_breakdown_lines: [],
    },
    onConfirm,
}) => {
    const { formatMessage } = useSafeIntl();
    const [isDetailedMode, setIsDetailedMode] = useState<boolean>(false);
    useEffect(
        () => setIsDetailedMode(defaultValues.cost_breakdown_lines?.length > 0),
        [defaultValues],
    );

    const validationSchema = useMemo(
        () =>
            Yup.object().shape({
                unit: Yup.string(),
                unit_cost: Yup.number().required(
                    formatMessage(MESSAGES.required),
                ),
                cost_breakdown_lines: Yup.array().of(
                    Yup.object().shape({
                        name: Yup.string().required(
                            formatMessage(MESSAGES.required),
                        ),
                        unit_cost: Yup.number().required(
                            formatMessage(MESSAGES.required),
                        ),
                        category: Yup.string().required(
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
        onSubmit: () => {
            if (
                values.unit_type !== undefined &&
                values.unit_cost !== undefined
            ) {
                onConfirm({
                    unit_type: values.unit_type,
                    unit_cost: values.unit_cost,
                    cost_breakdown_lines: isDetailedMode
                        ? values.cost_breakdown_lines
                        : [],
                });
            }
        },
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

    const getErrors = useTranslatedErrors({
        errors,
        touched,
        formatMessage,
        messages: MESSAGES,
    });

    const onAddCostItem = useCallback(() => {
        const newCostItems = [
            ...values.cost_breakdown_lines,
            { ...DEFAULT_COST_LINE },
        ];
        setFieldValue('cost_breakdown_lines', newCostItems);
    }, [values, setFieldValue]);

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
                    <FormControl
                        fullWidth
                        margin="normal"
                        sx={styles.formControl}
                    >
                        <Typography>{formatMessage(MESSAGES.unit)}</Typography>
                        <InputComponent
                            type="text"
                            keyValue="unit_type"
                            onChange={setFieldValueAndState}
                            errors={getErrors('unit_type')}
                            value={values.unit_type}
                            required
                            withMarginTop={false}
                        />
                    </FormControl>
                    <FormControl
                        fullWidth
                        margin="normal"
                        sx={styles.formControl}
                    >
                        <Typography>
                            {formatMessage(MESSAGES.costPerUnit)}
                        </Typography>
                        <Box sx={styles.costControlWrapper}>
                            <Typography
                                variant="body1"
                                color="textSecondary"
                                sx={{ marginRight: 0.5, paddingTop: 1 }}
                            >
                                $
                            </Typography>
                            <InputComponent
                                type="number"
                                keyValue="unit_cost"
                                onChange={setFieldValueAndState}
                                errors={getErrors('unit_cost')}
                                value={values.unit_cost}
                                required
                                withMarginTop={false}
                                disabled={isDetailedMode}
                            />
                        </Box>
                    </FormControl>
                    <FormControl>
                        <FormControlLabel
                            control={
                                <Switch
                                    size="small"
                                    checked={isDetailedMode}
                                    onChange={() =>
                                        setIsDetailedMode(!isDetailedMode)
                                    }
                                    color="primary"
                                    sx={{ marginLeft: 1.5 }}
                                />
                            }
                            label={formatMessage(MESSAGES.detailedCosts)}
                            labelPlacement="start"
                            sx={{ marginLeft: 0 }}
                        />
                    </FormControl>
                    {isDetailedMode && (
                        <InterventionCostBreakdownLinesForm
                            costBreakdownLines={values.cost_breakdown_lines}
                            onUpdateField={setFieldValueAndState}
                            onAddInterventionCostBreakdownLine={onAddCostItem}
                            onRemoveInterventionCostBreakdownLine={
                                onRemoveCostItem
                            }
                            onTotalCostChanges={onTotalCostChanges}
                            errors={errors.cost_breakdown_lines}
                            touched={touched.cost_breakdown_lines}
                        />
                    )}
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
