import React, { FC } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { FormikErrors, FormikTouched } from 'formik';
import { DeleteIconButton } from 'Iaso/components/Buttons/DeleteIconButton';
import { ColorPicker } from 'Iaso/components/forms/ColorPicker';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { SxStyles } from 'Iaso/types/general';
import { useGetChildError } from '../../../../hooks/useGetChildError';
import { Scale } from '../../../planning/types/metrics';
import { DEFAULT_LEGEND_CONFIG_ITEM } from '../../hooks/useMetricTypeFormState';
import { MESSAGES } from '../../messages';

const styles: SxStyles = {
    legendConfigContainer: {
        mt: 2,
    },
    scaleContainter: {
        display: 'flex',
        alignItems: 'center',
        mb: 2,
        gap: 1,
        ' button': {
            visibility: 'hidden',
        },
        '&:hover button': {
            visibility: 'visible',
        },
    },
};

type Props = {
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
};

const list_field_key = 'legend_config';

export const LegendConfigForm: FC<Props> = ({
    legendConfig,
    onAdd,
    onRemove,
    errors,
    touched,
    onUpdateField,
}) => {
    const { formatMessage } = useSafeIntl();

    const getChildError = useGetChildError<Scale>({
        errors,
        touched,
    });

    return (
        <Box sx={styles.legendConfigContainer}>
            <Typography variant="h6" gutterBottom>
                {formatMessage(MESSAGES.scale)}
            </Typography>
            {React.Children.toArray(
                legendConfig.map((scale, index) => (
                    <ScaleForm
                        scale={scale}
                        onUpdateField={(field, value) =>
                            onUpdateField(list_field_key, index, field, value)
                        }
                        onRemove={() => onRemove(list_field_key, index)}
                        getErrors={key => getChildError(key, index)}
                    />
                )),
            )}
            <Button
                onClick={() =>
                    onAdd(list_field_key, DEFAULT_LEGEND_CONFIG_ITEM, {})
                }
            >
                {formatMessage(MESSAGES.addScaleItem)}
            </Button>
        </Box>
    );
};

type ScaleFormProps = {
    scale: Scale;
    onUpdateField: (field: string, value: any) => void;
    onRemove: () => void;
    getErrors: (keyValue: string) => string[];
};

export const ScaleForm: FC<ScaleFormProps> = ({
    scale,
    onUpdateField,
    onRemove,
    getErrors,
}) => {
    return (
        <Box sx={styles.scaleContainter}>
            <InputComponent
                keyValue="value"
                value={scale.value}
                onChange={onUpdateField}
                errors={getErrors('value')}
                wrapperSx={{ flexGrow: 1 }}
                withMarginTop={false}
                type={'text'}
            />
            <ColorPicker
                currentColor={scale.color}
                onChangeColor={color => onUpdateField('color', color)}
                displayLabel={false}
            />
            <DeleteIconButton onClick={onRemove} />
        </Box>
    );
};
