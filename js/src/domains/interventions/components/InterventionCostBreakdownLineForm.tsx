import React, { FC } from 'react';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { Stack } from '@mui/material';
import { DropdownOptions, IconButton } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { SxStyles } from 'Iaso/types/general';
import { noOp } from 'Iaso/utils';
import { MESSAGES } from '../../messages';
import { InterventionCostBreakdownLine } from '../../planning/types/interventions';

const styles = {
    inputGrow: {
        flexGrow: 1,
    },
} satisfies SxStyles;

const currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
};

type Props = {
    costBreakdownLine: InterventionCostBreakdownLine;
    interventionCostCategories: DropdownOptions<string>[];
    interventionCostUnitTypes: DropdownOptions<string>[];
    currency?: string;
    onUpdateField: (field: string | null, value: any) => void;
    onRemove: () => void;
    getErrors: (keyValue: string) => string[];
};

export const InterventionCostBreakdownLineForm: FC<Props> = ({
    costBreakdownLine = {} as InterventionCostBreakdownLine,
    interventionCostCategories,
    interventionCostUnitTypes,
    currency,
    onUpdateField,
    onRemove = noOp,
    getErrors,
}) => {
    const currencySymbol = currency
        ? currencySymbols[currency] || `${currency} `
        : '';

    return (
        <Stack spacing={1} direction="row">
            <InputComponent
                keyValue="name"
                onChange={onUpdateField}
                value={costBreakdownLine.name}
                type="text"
                label={MESSAGES.detailedCostLabel}
                required
                errors={getErrors('name')}
                withMarginTop={false}
                wrapperSx={styles.inputGrow}
            />
            <InputComponent
                type="select"
                keyValue="category"
                multi={false}
                withMarginTop={false}
                clearable={false}
                options={interventionCostCategories}
                value={costBreakdownLine.category}
                onChange={onUpdateField}
                label={MESSAGES.detailedCostCategoryLabel}
                errors={getErrors('category')}
                wrapperSx={styles.inputGrow}
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
                wrapperSx={styles.inputGrow}
            />

            <InputComponent
                type="select"
                keyValue="unit_type"
                multi={false}
                withMarginTop={false}
                clearable={false}
                options={interventionCostUnitTypes}
                value={costBreakdownLine.unit_type}
                onChange={onUpdateField}
                label={MESSAGES.unit}
                errors={getErrors('unit')}
                wrapperSx={styles.inputGrow}
            />

            <IconButton
                onClick={() => onRemove()}
                overrideIcon={RemoveCircleOutlineIcon}
                tooltipMessage={MESSAGES.removeInterventionCostBreakdownLine}
            ></IconButton>
        </Stack>
    );
};
