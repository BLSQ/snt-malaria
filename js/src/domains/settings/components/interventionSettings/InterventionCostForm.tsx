import React, { useCallback } from 'react';
import { FormControl, Box, Typography, Divider, Button } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useTranslatedErrors } from 'Iaso/libs/validation';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../messages';

type Props = {
    defaultValues: { cost_unit?: string; cost_per_unit?: number };
    onConfirm: (data: { cost_unit: string; cost_per_unit: number }) => void;
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
    defaultValues = { cost_unit: undefined, cost_per_unit: undefined },
    onConfirm,
}) => {
    const { formatMessage } = useSafeIntl();
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
                            />
                        </Box>
                    </FormControl>
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
