import React, { FC, useMemo } from 'react';
import GroupsIcon from '@mui/icons-material/Groups';
import NumbersIcon from '@mui/icons-material/Numbers';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import {
    Box,
    Paper,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
} from '@mui/material';
import { IconButton, useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { noOp } from 'Iaso/utils';
import { pluralize } from '../../../../utils/pluralize';
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
    const { formatMessage } = useSafeIntl();
    const {
        costCategoryOptions,
        costUnitTypeOptions,
        populationOptions,
        currencySymbol,
    } = useInterventionContext();

    const selectedUnitLabel =
        costUnitTypeOptions.find(
            option =>
                String(option.value) === String(costBreakdownLine.unit_type),
        )?.label ?? formatMessage(MESSAGES.unit);

    const conversionDirectionOptions = useMemo(() => {
        const factor = Number(costBreakdownLine.conversion_factor) || 1;
        return [
            {
                value: 'direct',
                label: formatMessage(MESSAGES.budgetingCostLineUnitPerPeople, {
                    unit: pluralize(selectedUnitLabel, factor),
                }),
            },
            {
                value: 'inverse',
                label: formatMessage(MESSAGES.budgetingCostLinePeoplePerUnit, {
                    unit: selectedUnitLabel,
                }),
            },
        ];
    }, [formatMessage, selectedUnitLabel, costBreakdownLine.conversion_factor]);

    const handleCostDriverChange = (
        _event: React.MouseEvent,
        value: string | null,
    ) => {
        if (value === null) {
            return;
        }
        onUpdateField('is_proportional', value === 'proportional');
        if (value === 'fixed') {
            onUpdateField('population_layer', null);
        }
    };

    return (
        <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
                '&:hover .removeCostLineButton, &:focus-within .removeCostLineButton':
                    { opacity: 1 },
            }}
        >
            <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 0 }}>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: '3fr 2fr 1.5fr 2.7fr auto',
                        columnGap: 1,
                        rowGap: 2,
                        alignItems: 'start',
                    }}
                >
                    <InputComponent
                        keyValue="name"
                        onChange={onUpdateField}
                        value={costBreakdownLine.name}
                        type="text"
                        label={MESSAGES.detailedCostLabel}
                        required
                        errors={getErrors('name')}
                        withMarginTop={false}
                        wrapperSx={{ minWidth: 0 }}
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
                        wrapperSx={{ minWidth: 0 }}
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
                        wrapperSx={{ minWidth: 0 }}
                    />
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
                        wrapperSx={{ minWidth: 0 }}
                    />
                    <ToggleButtonGroup
                        value={
                            costBreakdownLine.is_proportional
                                ? 'proportional'
                                : 'fixed'
                        }
                        size="small"
                        exclusive
                        onChange={handleCostDriverChange}
                        sx={{ height: 40 }}
                    >
                        <ToggleButton value="fixed">
                            <Tooltip
                                title={formatMessage(
                                    MESSAGES.costItemFixedLabel,
                                )}
                            >
                                <NumbersIcon fontSize="small" />
                            </Tooltip>
                        </ToggleButton>
                        <ToggleButton value="proportional">
                            <Tooltip
                                title={formatMessage(
                                    MESSAGES.costItemProportionalLabel,
                                )}
                            >
                                <GroupsIcon fontSize="small" />
                            </Tooltip>
                        </ToggleButton>
                    </ToggleButtonGroup>
                    {costBreakdownLine.is_proportional && (
                        <>
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
                                wrapperSx={{
                                    gridColumn: 'span 2',
                                    minWidth: 0,
                                }}
                            />
                            <InputComponent
                                type="number"
                                keyValue="conversion_factor"
                                onChange={onUpdateField}
                                required
                                withMarginTop={false}
                                label={MESSAGES.costLineFactorLabel}
                                value={costBreakdownLine.conversion_factor}
                                errors={getErrors('conversion_factor')}
                                numberInputOptions={{ decimalScale: 6 }}
                                wrapperSx={{ minWidth: 0 }}
                            />
                            <InputComponent
                                type="select"
                                keyValue="invert_conversion_factor"
                                multi={false}
                                withMarginTop={false}
                                clearable={false}
                                options={conversionDirectionOptions}
                                value={
                                    costBreakdownLine.invert_conversion_factor
                                        ? 'inverse'
                                        : 'direct'
                                }
                                onChange={(field, value) =>
                                    onUpdateField(field, value === 'inverse')
                                }
                                label={MESSAGES.costLineDirectionLabel}
                                errors={getErrors('invert_conversion_factor')}
                                wrapperSx={{ minWidth: 0 }}
                            />
                        </>
                    )}
                </Box>
            </Paper>
            <Box
                className="removeCostLineButton"
                sx={{ opacity: 0, transition: 'opacity 0.2s' }}
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
