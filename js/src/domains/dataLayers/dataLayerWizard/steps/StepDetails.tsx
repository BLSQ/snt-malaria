import React, { FC } from 'react';
import { Grid } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useTranslatedErrors } from 'Iaso/libs/validation';
import { useGetExtendedFormikContext } from '../../../../hooks/useGetExtendedFormikContext';
import { MESSAGES } from '../../messages';
import { MetricTypeFormModel } from '../../types/metrics';
import { WizardLayerType } from '../constants';
import { OpenHexaSourcePicker } from '../OpenHexaSourcePicker';

type Props = {
    layerType: WizardLayerType;
    categoryOptions: { label: string; value: string }[];
    existingCodes: Set<string>;
};

export const StepDetails: FC<Props> = ({
    layerType,
    categoryOptions,
    existingCodes,
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

    if (layerType === 'openhexa') {
        return <OpenHexaSourcePicker existingCodes={existingCodes} />;
    }

    const isComposite = layerType === 'composite';

    return (
        <div>
            <InputComponent
                keyValue="name"
                type="text"
                required
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
                options={categoryOptions}
                onChange={setFieldValueAndState}
                value={values.category}
                label={MESSAGES.category}
                errors={getErrors('category')}
            />
            <InputComponent
                keyValue="description"
                type="textarea"
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
                        onChange={setFieldValueAndState}
                        value={values.unit_symbol}
                        label={MESSAGES.unitSymbol}
                        errors={getErrors('unit_symbol')}
                    />
                </Grid>
            </Grid>
        </div>
    );
};
