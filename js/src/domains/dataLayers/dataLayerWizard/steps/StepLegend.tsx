import React, { FC, useCallback, useMemo } from 'react';
import { Alert, Box } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useTranslatedErrors } from 'Iaso/libs/validation';
import { SxStyles } from 'Iaso/types/general';
import {
    isConcreteLegend,
    LEGEND_TYPE_MAX_ITEMS,
    LEGEND_TYPE_MIN_ITEMS,
} from '../../../../constants/legend';
import { useGetExtendedFormikContext } from '../../../../hooks/useGetExtendedFormikContext';
import { getCompositeLegendOptions } from '../../../compositeLayerEditor/utils/legendOptions';
import { useGetLegendTypes } from '../../../planning/hooks/useGetLegendTypes';
import { LegendConfigForm } from '../../dataLayerForm/LegendConfigForm';
import { MESSAGES } from '../../messages';
import { MetricTypeFormModel } from '../../types/metrics';
import { WizardLayerType } from '../constants';

const styles: SxStyles = {
    summary: { mt: 3 },
};

type Props = {
    layerType: WizardLayerType;
};

export const StepLegend: FC<Props> = ({ layerType }) => {
    const { formatMessage } = useSafeIntl();
    const { data: legendTypeOptions, isLoading } = useGetLegendTypes();
    const {
        values,
        setFieldValueAndState,
        setChildFieldValueAndState,
        addChildValue,
        removeChildValue,
        errors,
        touched,
    } = useGetExtendedFormikContext<MetricTypeFormModel>();
    const getErrors = useTranslatedErrors({
        errors,
        touched,
        formatMessage,
        messages: MESSAGES,
    });

    const isComposite = layerType === 'composite';
    const compositeLegendOptions = useMemo(
        () => getCompositeLegendOptions(formatMessage),
        [formatMessage],
    );

    const onChangeTopColor = useCallback(
        (color: string) => setFieldValueAndState('legend_top_color', color),
        [setFieldValueAndState],
    );

    return (
        <Box>
            <InputComponent
                type="select"
                keyValue="legend_type"
                multi={false}
                clearable={false}
                options={
                    isComposite
                        ? compositeLegendOptions
                        : legendTypeOptions || []
                }
                value={values.legend_type}
                onChange={setFieldValueAndState}
                label={MESSAGES.legendType}
                errors={getErrors('legend_type')}
                loading={!isComposite && isLoading}
            />
            {isConcreteLegend(values.legend_type) && (
                <LegendConfigForm
                    legendType={values.legend_type}
                    legendConfig={values.legend_config || []}
                    onAdd={addChildValue}
                    onRemove={removeChildValue}
                    touched={touched?.legend_config}
                    errors={errors?.legend_config}
                    onUpdateField={setChildFieldValueAndState}
                    minItems={LEGEND_TYPE_MIN_ITEMS[values.legend_type]}
                    maxItems={LEGEND_TYPE_MAX_ITEMS[values.legend_type]}
                    topColor={values.legend_top_color}
                    onChangeTopColor={onChangeTopColor}
                />
            )}
            {values.category && (
                <Alert severity="info" icon={false} sx={styles.summary}>
                    {formatMessage(MESSAGES.wizardSummaryAddsToCategory, {
                        category: values.category,
                    })}
                </Alert>
            )}
        </Box>
    );
};
