import React, { useMemo } from 'react';
import { FC } from 'react';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { Box, Button, Typography } from '@mui/material';
import { IconButton } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { noOp } from 'Iaso/utils';
import { InterventionCostLine } from '../../../planning/types/interventions';
import { useGetInterventionCostCategories } from '../../hooks/useGetInterventionCostCategories';
import { MESSAGES } from '../../messages';

type Props = {
    onUpdateField: (field: string, value: any) => void;
    costLines: InterventionCostLine[];
    onAddCostLine: () => void;
    onRemoveCostLine: (index: number) => void;
};

export const InterventionCostLinesForm: FC<Props> = ({
    costLines,
    onUpdateField,
    onAddCostLine,
    onRemoveCostLine,
}) => {
    const totalCost = useMemo(
        () => costLines?.reduce((total, costLine) => total + costLine.cost, 0),
        [costLines],
    );
    return costLines ? (
        <Box>
            {costLines.map((cd, index) => (
                <InterventionCostLineForm
                    key={`cost-details-row-${cd.id}`}
                    costLines={cd}
                    onUpdateField={(field, value) =>
                        onUpdateField(`cost_lines[${index}].${field}`, value)
                    }
                    onRemove={() => onRemoveCostLine(index)}
                />
            ))}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                }}
            >
                <Button variant="text" onClick={onAddCostLine}>
                    Add Cost
                </Button>
                <Typography>Total cost ${totalCost}</Typography>
            </Box>
        </Box>
    ) : (
        <></>
    );
};

type RowProps = {
    costLines: any;
    onUpdateField: (field: string, value: any) => void;
    onRemove: () => void;
};

export const InterventionCostLineForm: FC<RowProps> = ({
    costLines = {},
    onUpdateField,
    onRemove = noOp,
}) => {
    const interventionCostCategories = useGetInterventionCostCategories();

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'row',
                gap: 1,
                marginBottom: 2,
            }}
        >
            <IconButton
                onClick={() => onRemove()}
                overrideIcon={RemoveCircleOutlineIcon}
                tooltipMessage={MESSAGES.removeDetailedCost}
            ></IconButton>
            <Box
                sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}
            >
                <InputComponent
                    keyValue="name"
                    onChange={onUpdateField}
                    value={costLines.name}
                    type="text"
                    labelString="yay"
                    required
                    withMarginTop={false}
                />
                <InputComponent
                    type="select"
                    keyValue="category"
                    multi={false}
                    withMarginTop={false}
                    wrapperSx={{ flexGrow: 1 }}
                    clearable={false}
                    options={interventionCostCategories}
                    value={costLines.category}
                    onChange={onUpdateField}
                />
            </Box>
            <InputComponent
                type="number"
                keyValue="cost"
                onChange={onUpdateField}
                required
                withMarginTop={false}
                labelString="Unit Cost"
                wrapperSx={{ width: '95px' }}
                value={costLines.cost}
            />
        </Box>
    );
};
