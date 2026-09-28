import React, { FC } from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useTranslatedErrors } from 'Iaso/libs/validation';
import { SxStyles } from 'Iaso/types/general';
import { useGetExtendedFormikContext } from '../../../../hooks/useGetExtendedFormikContext';
import { MESSAGES } from '../../messages';
import { MetricTypeFormModel } from '../../types/metrics';
import { WizardLayerType } from '../constants';
import { OpenHexaSourcePicker } from '../OpenHexaSourcePicker';

const styles: SxStyles = {
    readOnlyHint: { display: 'block', mt: 2, mb: 1 },
    population: { mt: 3 },
};

type Props = {
    layerType: WizardLayerType;
    categoryOptions: { label: string; value: string }[];
    existingCodes: Set<string>;
    isEditing?: boolean;
    codeLocked?: boolean;
};

export const StepDetails: FC<Props> = ({
    layerType,
    categoryOptions,
    existingCodes,
    isEditing = false,
    codeLocked = false,
}) => {
    const { formatMessage } = useSafeIntl();
    const { values, setFieldValueAndState, errors, touched } =
        useGetExtendedFormikContext<MetricTypeFormModel>();
    const getErrors = useTranslatedErrors({
        errors,
        touched,
        formatMessage,
        messages: MESSAGES,
    });

    const isComposite = layerType === 'composite';
    const isOpenHexa = layerType === 'openhexa';

    return (
        <Box>
            {isOpenHexa && !isEditing && (
                <OpenHexaSourcePicker
                    existingCodes={existingCodes}
                    disabled={codeLocked}
                />
            )}
            {isOpenHexa && (
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={styles.readOnlyHint}
                >
                    {formatMessage(MESSAGES.openHexaFieldsReadOnly)}
                </Typography>
            )}
            <InputComponent
                keyValue="name"
                type="text"
                required
                disabled={isOpenHexa}
                onChange={setFieldValueAndState}
                value={values.name}
                label={MESSAGES.label}
                errors={getErrors('name')}
            />
            {!isComposite && (
                <InputComponent
                    keyValue="code"
                    type="text"
                    required
                    disabled={isEditing || isOpenHexa || codeLocked}
                    onChange={setFieldValueAndState}
                    value={values.code}
                    label={MESSAGES.variable}
                    errors={getErrors('code')}
                />
            )}
            <InputComponent
                keyValue="category"
                type="select"
                required
                freeSolo
                clearable={false}
                disabled={isOpenHexa}
                options={categoryOptions}
                onChange={setFieldValueAndState}
                value={values.category}
                label={MESSAGES.category}
                errors={getErrors('category')}
            />
            <InputComponent
                keyValue="description"
                type="textarea"
                disabled={isOpenHexa}
                onChange={setFieldValueAndState}
                value={values.description}
                label={MESSAGES.description}
                errors={getErrors('description')}
            />
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <InputComponent
                        keyValue="units"
                        type="text"
                        disabled={isOpenHexa}
                        onChange={setFieldValueAndState}
                        value={values.units}
                        label={MESSAGES.units}
                        errors={getErrors('units')}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <InputComponent
                        keyValue="unit_symbol"
                        type="text"
                        disabled={isOpenHexa}
                        onChange={setFieldValueAndState}
                        value={values.unit_symbol}
                        label={MESSAGES.unitSymbol}
                        errors={getErrors('unit_symbol')}
                    />
                </Grid>
            </Grid>
            <Box sx={styles.population}>
                <InputComponent
                    keyValue="is_population"
                    type="checkbox"
                    onChange={setFieldValueAndState}
                    value={values.is_population}
                    label={MESSAGES.is_population}
                    withMarginTop={false}
                    disabled={isOpenHexa}
                />
            </Box>
        </Box>
    );
};
