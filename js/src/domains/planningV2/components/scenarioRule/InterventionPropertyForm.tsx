import React, { FC, useMemo } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { DeleteIconButton } from 'Iaso/components/Buttons/DeleteIconButton';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { SxStyles } from 'Iaso/types/general';
import { Intervention } from '../../../planning/types/interventions';
import { InterventionProperties } from '../../types/scenarioRule';

const styles: SxStyles = {
    interventionPropertiesContainer: {
        display: 'flex',
        mb: 2,
        gap: 1,
        ' button': {
            visibility: 'hidden',
        },
        '&:hover button': {
            visibility: 'visible',
        },
    },
    scaleLabel: { flexGrow: 1, textAlign: 'right' },
    coverageWrapper: {
        width: 75,
    },
    categoryName: { minWidth: 200, maxWidth: 200 },
    labelWrapper: {
        maxHeight: 40,
        display: 'flex',
        alignItems: 'center',
    },
    interventionWrapper: {
        flexGrow: 1,
    },
};

type Props = {
    interventions: Intervention[];
    interventionProperty: InterventionProperties;
    categoryName: string;
    onUpdateField: (field: string, value: any) => void;
    onRemove: () => void;
    getErrors: (keyValue: string) => string[];
};

export const InterventionPropertyForm: FC<Props> = ({
    interventionProperty,
    interventions,
    categoryName,
    onUpdateField,
    getErrors,
    onRemove,
}) => {
    const interventionOptions = useMemo(
        () => interventions.map(i => ({ value: i.id, label: i.name })),
        [interventions],
    );

    return (
        <Box sx={styles.interventionPropertiesContainer}>
            <Box sx={styles.labelWrapper}>
                <Tooltip title={categoryName}>
                    <Typography
                        variant="body2"
                        fontWeight="medium"
                        color="textSecondary"
                        noWrap={true}
                        sx={styles.categoryName}
                    >
                        {categoryName}
                    </Typography>
                </Tooltip>
            </Box>
            <InputComponent
                type="select"
                keyValue="intervention"
                multi={false}
                withMarginTop={false}
                wrapperSx={styles.interventionWrapper}
                clearable={false}
                options={interventionOptions}
                value={
                    interventionProperty.intervention ||
                    interventionOptions[0]?.value
                }
                onChange={onUpdateField}
                errors={getErrors('intervention')}
            />
            <DeleteIconButton onClick={() => onRemove()} />
        </Box>
    );
};
