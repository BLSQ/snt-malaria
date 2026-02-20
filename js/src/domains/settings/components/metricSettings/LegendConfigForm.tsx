import React, { FC } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { FormikErrors, FormikTouched } from 'formik';
import { SxStyles } from 'Iaso/types/general';
import { useGetChildError } from '../../../../hooks/useGetChildError';
import { Scale } from '../../../planning/types/metrics';
import { DEFAULT_LEGEND_CONFIG_ITEM } from '../../hooks/useMetricTypeFormState';
import { MESSAGES } from '../../messages';
import { ScaleForm } from './ScaleForm';

const styles: SxStyles = {
    title: { my: 2 },
    legendConfigContainer: {
        mt: 2,
        fontWeight: 'medium',
    },
    scaleContainter: {
        mb: 2,
        ' button': {
            visibility: 'hidden',
        },
        '&:hover button': {
            visibility: 'visible',
        },
    },
};

type Props = {
    minItems: number;
    maxItems: number;
    legendConfig: Scale[];
    onAdd: (key: string, defaultValue: any, extendedValue: any) => void;
    onRemove: (key: string, index: number) => void;
    touched: FormikTouched<Scale>[] | undefined;
    errors: string | string[] | FormikErrors<Scale>[] | undefined;
    onUpdateField: (
        list_field_key: string,
        index: number,
        field: string,
        value: any,
    ) => void;
    legendType: string;
};

const list_field_key = 'legend_config';

export const LegendConfigForm: FC<Props> = ({
    minItems,
    maxItems,
    legendConfig,
    onAdd,
    onRemove,
    errors,
    touched,
    onUpdateField,
    legendType,
}) => {
    const { formatMessage } = useSafeIntl();
    const getChildError = useGetChildError<Scale>({
        errors,
        touched,
    });

    return (
        <Box sx={styles.legendConfigContainer}>
            <Typography variant="body1" sx={styles.title}>
                {formatMessage(MESSAGES.scale)}
            </Typography>

            {React.Children.toArray(
                legendConfig.map((scale, index) => (
                    <ScaleForm
                        scale={scale}
                        legendType={legendType}
                        onUpdateField={(field, value) =>
                            onUpdateField(list_field_key, index, field, value)
                        }
                        onRemove={() => onRemove(list_field_key, index)}
                        getErrors={key => getChildError(key, index)}
                        canBeRemoved={legendConfig.length > minItems}
                    />
                )),
            )}

            {errors && typeof errors === 'string' && (
                <Typography color="error" gutterBottom mt={2}>
                    {errors}
                </Typography>
            )}
            <Button
                onClick={() =>
                    onAdd(list_field_key, DEFAULT_LEGEND_CONFIG_ITEM, {})
                }
                disabled={legendConfig.length >= maxItems}
            >
                {formatMessage(MESSAGES.addScaleItem)}
            </Button>
        </Box>
    );
};
