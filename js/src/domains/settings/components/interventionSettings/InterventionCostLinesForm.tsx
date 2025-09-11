import React, { useMemo } from 'react';
import { FC } from 'react';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { Box, Button, Typography } from '@mui/material';
import { IconButton, useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { DropdownOptions } from 'Iaso/types/utils';
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
    const { formatMessage } = useSafeIntl();
    const totalCost = useMemo(
        () => costLines?.reduce((total, costLine) => total + costLine.cost, 0),
        [costLines],
    );
    return costLines ? (
        <Box sx={{ marginTop: 1.5 }}>
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
                    {formatMessage(MESSAGES.addCostLine)}
                </Button>
                <Typography>
                    {formatMessage(MESSAGES.totalCost)} $
                    {totalCost.toFixed(2) ?? 0.0}
                </Typography>
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
    const { data: interventionCostCategories = [] } =
        useGetInterventionCostCategories<DropdownOptions<any>[]>(data =>
            data.map(d => ({
                value: d.id,
                label: d.name,
            })),
        );

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
                tooltipMessage={MESSAGES.removeCostLine}
            ></IconButton>
            <Box
                sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}
            >
                <InputComponent
                    keyValue="name"
                    onChange={onUpdateField}
                    value={costLines.name}
                    type="text"
                    label={MESSAGES.detailedCostLabel}
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
                    label={MESSAGES.detailedCostCategoryLabel}
                />
            </Box>
            <InputComponent
                type="number"
                keyValue="cost"
                onChange={onUpdateField}
                required
                withMarginTop={false}
                label={MESSAGES.detailedCostUnitLabel}
                wrapperSx={{ width: '95px' }}
                value={costLines.cost}
            />
        </Box>
    );
};
