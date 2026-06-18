import React, { FC, useMemo } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { DeleteIconButton } from 'Iaso/components/Buttons/DeleteIconButton';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { SxStyles } from 'Iaso/types/general';
import { Intervention } from '../../../../interventions/types';

const styles = {
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
    categoryName: { minWidth: 160, maxWidth: 300 },
    labelWrapper: {
        maxHeight: 40,
        display: 'flex',
        alignItems: 'center',
    },
    interventionWrapper: {
        flexGrow: 1,
    },
} satisfies SxStyles;

type Props = {
    interventions: Intervention[];
    interventionId: number;
    categoryName: string;
    onUpdateField: (interventionId: number) => void;
    onRemove: () => void;
};

export const InterventionPropertyForm: FC<Props> = ({
    interventionId,
    interventions,
    categoryName,
    onUpdateField,
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
                value={interventionId || interventionOptions[0]?.value}
                onChange={(_key: string, value: number) => onUpdateField(value)}
            />
            <DeleteIconButton onClick={() => onRemove()} />
        </Box>
    );
};
