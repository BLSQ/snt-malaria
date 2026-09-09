import React, { FC } from 'react';
import { Box, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { SxStyles } from 'Iaso/types/general';
import { useGetExtendedFormikContext } from '../../../../hooks/useGetExtendedFormikContext';
import { MESSAGES } from '../../messages';
import { MetricTypeFormModel } from '../../types/metrics';
import { WizardLayerType } from '../constants';
import { LayerTypeCards } from '../LayerTypeCards';

const styles: SxStyles = {
    question: { fontWeight: 600, mb: 1.5 },
    population: { mt: 3 },
    populationHint: { display: 'block', mt: 0.5 },
};

type Props = {
    layerType: WizardLayerType;
    onChangeLayerType: (value: WizardLayerType) => void;
    showOpenHexa: boolean;
    showComposite: boolean;
    /** Name of the layer that is the population denominator today, if any. */
    populationHolderName?: string;
};

export const StepType: FC<Props> = ({
    layerType,
    onChangeLayerType,
    showOpenHexa,
    showComposite,
    populationHolderName,
}) => {
    const { formatMessage } = useSafeIntl();
    const { values, setFieldValueAndState } =
        useGetExtendedFormikContext<MetricTypeFormModel>();

    return (
        <Box>
            <Typography variant="subtitle1" sx={styles.question}>
                {formatMessage(MESSAGES.wizardTypeQuestion)}
            </Typography>
            <LayerTypeCards
                value={layerType}
                onChange={onChangeLayerType}
                showOpenHexa={showOpenHexa}
                showComposite={showComposite}
            />
            <Box sx={styles.population}>
                <InputComponent
                    keyValue="is_population"
                    type="checkbox"
                    onChange={setFieldValueAndState}
                    value={values.is_population}
                    label={MESSAGES.is_population}
                    withMarginTop={false}
                    disabled={layerType === 'openhexa'}
                />
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={styles.populationHint}
                >
                    {populationHolderName
                        ? formatMessage(MESSAGES.wizardPopulationHolder, {
                              holder: populationHolderName,
                          })
                        : formatMessage(MESSAGES.wizardPopulationNoHolder)}
                </Typography>
            </Box>
        </Box>
    );
};
