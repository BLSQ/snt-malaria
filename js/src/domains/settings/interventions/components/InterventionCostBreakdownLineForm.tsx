import React, { FC } from 'react';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { Grid, Stack } from '@mui/material';
import { IconButton } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { SxStyles } from 'Iaso/types/general';
import { noOp } from 'Iaso/utils';
import { MESSAGES } from '../../../messages';
import { useInterventionContext } from '../contexts/InterventionContext';
import { InterventionCostBreakdownLine } from '../../../interventions/types';

const styles = {
    inputGrow: {
        flexGrow: 1,
    },
} satisfies SxStyles;

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
        populationOptions,
        currencySymbol,
    } = useInterventionContext();

    return (
        <Grid container spacing={1}>
            <Grid item xs={3}>
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
            </Grid>
            <Grid item xs={2}>
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
                    wrapperSx={styles.inputGrow}
                />
            </Grid>
            <Grid item xs={1}>
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
            </Grid>
            <Grid item xs={2}>
                <InputComponent
                    type="select"
                    keyValue="unit_type"
                    multi={false}
                    withMarginTop={false}
                    clearable={false}
                    options={costUnitTypeOptions}
                    value={costBreakdownLine.unit_type}
                    onChange={onUpdateField}
                    label={MESSAGES.unit}
                    errors={getErrors('unit')}
                    wrapperSx={styles.inputGrow}
                />
            </Grid>
            <Grid item xs={3} spacing={1}>
                <InputComponent
                    type="select"
                    keyValue="population_layer"
                    multi={false}
                    withMarginTop={false}
                    clearable
                    options={populationOptions}
                    value={costBreakdownLine.population_layer || ''}
                    onChange={onUpdateField}
                    label={MESSAGES.targetPopulationLabel}
                    errors={getErrors('population_layer')}
                    wrapperSx={styles.inputGrow}
                />
            </Grid>
            <Grid
                item
                xs={1}
                display="flex"
                alignItems="center"
                justifyContent="flex-start"
            >
                <IconButton
                    onClick={() => onRemove()}
                    overrideIcon={RemoveCircleOutlineIcon}
                    tooltipMessage={
                        MESSAGES.removeInterventionCostBreakdownLine
                    }
                ></IconButton>
            </Grid>
        </Grid>
    );
};
