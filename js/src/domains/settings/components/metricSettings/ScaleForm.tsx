import React, { FC } from 'react';
import { Box, Stack } from '@mui/material';
import { DeleteIconButton } from 'Iaso/components/Buttons/DeleteIconButton';
import { ColorPicker } from 'Iaso/components/forms/ColorPicker';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { SxStyles } from 'Iaso/types/general';
import { Scale } from '../../../planning/types/metrics';

const styles: SxStyles = {
    title: { mx: 2 },
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
    scale: Scale;
    legendType: string;
    canBeRemoved: boolean;
    onUpdateField: (field: string, value: any) => void;
    onRemove: () => void;
    getErrors: (keyValue: string) => string[];
};

export const ScaleForm: FC<Props> = ({
    scale,
    legendType,
    canBeRemoved,
    onUpdateField,
    onRemove,
    getErrors,
}) => {
    return (
        <Stack direction="row" spacing={2} sx={styles.scaleContainter}>
            <InputComponent
                keyValue="value"
                type={legendType === 'ordinal' ? 'text' : 'number'}
                value={scale.value}
                onChange={onUpdateField}
                errors={getErrors('value')}
                wrapperSx={{ flexGrow: 1 }}
                withMarginTop={false}
            />
            <Box pt={1}>
                <ColorPicker
                    currentColor={scale.color}
                    onChangeColor={color => onUpdateField('color', color)}
                    displayLabel={false}
                />
            </Box>
            {(canBeRemoved && <DeleteIconButton onClick={onRemove} />) || (
                <Box width={40} />
            )}
        </Stack>
    );
};
