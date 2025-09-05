import React, { useCallback } from 'react';
import { FormControl, Box, Typography, Divider, Button } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useTranslatedErrors } from 'Iaso/libs/validation';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../messages';

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
    unit: Yup.string(),
    costPerUnit: Yup.number(),
});

export const InterventionCostForm: React.FC = () => {
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
        initialValues: {
            unit: undefined,
            costPerUnit: undefined,
        },
        validationSchema,
        onSubmit: () => {
            console.log('Form submitted with values:', {
                unit: values.unit,
                costPerUnit: values.costPerUnit,
            });
            // onConfirm({ unit, costPerUnit })
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
                            keyValue="unit"
                            onChange={setFieldValueAndState}
                            errors={getErrors('unit')}
                            value={values.unit}
                            required
                            // @ts-ignore
                            params={{ sx: { marginTop: 0, maxWidth: '30px' } }}
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
                        <InputComponent
                            type="number"
                            keyValue="costPerUnit"
                            onChange={setFieldValueAndState}
                            errors={getErrors('costPerUnit')}
                            value={values.costPerUnit}
                            required
                            sx={{ marginTop: 0, maxWidth: '200px' }}
                        />
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
