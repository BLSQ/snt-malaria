import React, { useCallback, useEffect, useState } from 'react';
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
import { InterventionCostLine } from '../../types/interventionCost';
import { InterventionCostLinesForm } from './InterventionCostLinesForm';

type Props = {
    defaultValues: {
        cost_unit?: string;
        cost_per_unit?: number;
        cost_lines: InterventionCostLine[];
    };
    onConfirm: (data: {
        cost_unit: string;
        cost_per_unit: number;
        cost_lines: any[];
    }) => void;
};

const DEFAULT_COST_LINE = {
    name: '',
    category_id: undefined,
    cost: 0,
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
        alignItems: 'center',
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

const validationSchema = Yup.object().shape({
    cost_unit: Yup.string(),
    costPerUnit: Yup.number(),
});

export const InterventionCostForm: React.FC<Props> = ({
    defaultValues = {
        cost_unit: undefined,
        cost_per_unit: undefined,
        cost_lines: [],
    },
    onConfirm,
}) => {
    const { formatMessage } = useSafeIntl();
    const [isDetailedMode, setIsDetailedMode] = useState<boolean>(false);
    useEffect(
        () => setIsDetailedMode(defaultValues.cost_lines?.length > 0),
        [defaultValues],
    );

    const {
        values,
        setFieldValue,
        setFieldError,
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
                values.cost_unit !== undefined &&
                values.cost_per_unit !== undefined
            ) {
                onConfirm({
                    cost_unit: values.cost_unit,
                    cost_per_unit: values.cost_per_unit,
                    cost_lines: isDetailedMode ? values.cost_lines : [],
                });
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

    const getErrors = useTranslatedErrors({
        errors,
        touched,
        formatMessage,
        messages: MESSAGES,
    });

    const onAddCostLine = useCallback(() => {
        const newCostLines = [...values.cost_lines, { ...DEFAULT_COST_LINE }];
        setFieldValue('cost_lines', newCostLines);
    }, [values, setFieldValue]);

    const onRemoveCostLine = useCallback(
        (index: number) => {
            const newCostLines = [...values.cost_lines];
            newCostLines.splice(index, 1);
            setFieldValue('cost_lines', newCostLines);
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
                            keyValue="cost_unit"
                            onChange={setFieldValueAndState}
                            errors={getErrors('cost_unit')}
                            value={values.cost_unit}
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
                                sx={{ marginRight: 0.5 }}
                            >
                                $
                            </Typography>
                            <InputComponent
                                type="number"
                                keyValue="cost_per_unit"
                                onChange={setFieldValueAndState}
                                errors={getErrors('cost_per_unit')}
                                value={values.cost_per_unit}
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
                        <InterventionCostLinesForm
                            costLines={values.cost_lines}
                            onUpdateField={setFieldValueAndState}
                            onAddCostLine={onAddCostLine}
                            onRemoveCostLine={onRemoveCostLine}
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
