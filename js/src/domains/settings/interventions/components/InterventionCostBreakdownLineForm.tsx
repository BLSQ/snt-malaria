import React, { FC } from 'react';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { Box, Stack } from '@mui/material';
import { IconButton } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { noOp } from 'Iaso/utils';
import { InterventionCostBreakdownLine } from '../../../interventions/types';
import { MESSAGES } from '../../../messages';
import { useInterventionContext } from '../contexts/InterventionContext';

type Props = {
    costBreakdownLine: InterventionCostBreakdownLine;
    onUpdateField: (field: string | null, value: any) => void;
    onRemove: () => void;
    getErrors: (keyValue: string) => string[];
};

export const InterventionCostBreakdownLineForm: FC<Props> = ({
    costBreakdownLine = {} as InterventionCostBreakdownLine,
    onUpdateField,
    onRemove = noOp,
    getErrors,
}) => {
    const {
        costCategoryOptions,
        costUnitTypeOptions,
        costUnitTypesById,
        populationOptions,
        currencySymbol,
    } = useInterventionContext();

    const selectedUnitType = costBreakdownLine.unit_type
        ? costUnitTypesById[String(costBreakdownLine.unit_type)]
        : undefined;
    // If the unit isn't known yet (e.g. dropdown still loading), default to true so we don't
    // hide the target population dropdown for existing proportional lines.
    const selectedUnitIsProportional = selectedUnitType
        ? selectedUnitType.is_proportional
        : true;

    const handleUnitTypeChange = (field: string | null, value: any) => {
        onUpdateField(field, value);
        const nextUnit = value ? costUnitTypesById[String(value)] : undefined;
        if (nextUnit && !nextUnit.is_proportional) {
            // Non-proportional units are absolute cost drivers: drop any previously selected
            // population layer so the form state matches what the backend will persist.
            onUpdateField('population_layer', null);
        }
    };

    return (
        <Stack direction="row" spacing={1} alignItems="flex-start">
            <InputComponent
                keyValue="name"
                onChange={onUpdateField}
                value={costBreakdownLine.name}
                type="text"
                label={MESSAGES.detailedCostLabel}
                required
                errors={getErrors('name')}
                withMarginTop={false}
                wrapperSx={{ flex: 3, minWidth: 0 }}
            />
            <InputComponent
                type="select"
                keyValue="category"
                multi={false}
                withMarginTop={false}
                clearable={false}
                options={costCategoryOptions}
                value={costBreakdownLine.category}
                onChange={onUpdateField}
                label={MESSAGES.detailedCostCategoryLabel}
                errors={getErrors('category')}
                wrapperSx={{ flex: 2, minWidth: 0 }}
            />
            <InputComponent
                type="number"
                keyValue="unit_cost"
                onChange={onUpdateField}
                required
                withMarginTop={false}
                label={MESSAGES.detailedCostUnitLabel}
                value={costBreakdownLine.unit_cost}
                errors={getErrors('unit_cost')}
                numberInputOptions={{
                    decimalScale: 2,
                    prefix: currencySymbol,
                }}
                wrapperSx={{ flex: 2.2, minWidth: 0 }}
            />
            <InputComponent
                type="select"
                keyValue="unit_type"
                multi={false}
                withMarginTop={false}
                clearable={false}
                options={costUnitTypeOptions}
                value={costBreakdownLine.unit_type}
                onChange={handleUnitTypeChange}
                label={MESSAGES.unit}
                errors={getErrors('unit')}
                wrapperSx={{ flex: 2, minWidth: 0 }}
            />
            {selectedUnitIsProportional ? (
                <InputComponent
                    type="select"
                    keyValue="population_layer"
                    multi={false}
                    withMarginTop={false}
                    clearable
                    required
                    options={populationOptions}
                    value={costBreakdownLine.population_layer || ''}
                    onChange={onUpdateField}
                    label={MESSAGES.targetPopulationLabel}
                    errors={getErrors('population_layer')}
                    wrapperSx={{ flex: 3, minWidth: 0 }}
                />
            ) : (
                <Box sx={{ flex: 3, minWidth: 0 }} />
            )}
            <Box
                sx={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    height: 40,
                }}
            >
                <IconButton
                    onClick={() => onRemove()}
                    overrideIcon={RemoveCircleOutlineIcon}
                    tooltipMessage={
                        MESSAGES.removeInterventionCostBreakdownLine
                    }
                ></IconButton>
            </Box>
        </Stack>
    );
};
