import React, { useCallback } from 'react';
import { FC } from 'react';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { Box, Button } from '@mui/material';
import { IconButton, useSafeIntl } from 'bluesquare-components';
import { FormikErrors, FormikTouched } from 'formik';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { noOp } from 'Iaso/utils';
import { useGetInterventionCostBreakdownLineCategories } from '../../hooks/useGetInterventionCostBreakdownLineCategories';
import { useGetInterventionCostUnitTypes } from '../../hooks/useGetInterventionCostUnitType';
import { MESSAGES } from '../../messages';
import { InterventionCostBreakdownLine } from '../../types/InterventionCostBreakdownLine';

type Props = {
    onUpdateField: (field: string, value: any) => void;
    costBreakdownLines: InterventionCostBreakdownLine[];
    onAddInterventionCostBreakdownLine: () => void;
    onRemoveInterventionCostBreakdownLine: (index: number) => void;
    touched: FormikTouched<InterventionCostBreakdownLine>[] | undefined;
    errors:
        | string
        | string[]
        | FormikErrors<InterventionCostBreakdownLine>[]
        | undefined;
};

export const InterventionCostBreakdownLinesForm: FC<Props> = ({
    costBreakdownLines,
    onUpdateField,
    onAddInterventionCostBreakdownLine,
    onRemoveInterventionCostBreakdownLine,
    errors,
    touched,
}) => {
    const { formatMessage } = useSafeIntl();

    const getChildError = useCallback(
        (field, index) =>
            touched?.[index]?.[field] && errors?.[index]?.[field]
                ? [errors[index][field]]
                : [],
        [errors, touched],
    );

    return costBreakdownLines ? (
        <Box sx={{ marginTop: 1.5 }}>
            {costBreakdownLines.map((cd, index) => (
                <InterventionCostBreakdownLineForm
                    key={`cost-details-row-${cd.id}`}
                    costBreakdownLine={cd}
                    onUpdateField={(field, value) =>
                        onUpdateField(
                            `cost_breakdown_lines[${index}].${field}`,
                            value,
                        )
                    }
                    onRemove={() =>
                        onRemoveInterventionCostBreakdownLine(index)
                    }
                    getErrors={field => getChildError(field, index)}
                />
            ))}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                }}
            >
                <Button
                    variant="text"
                    onClick={onAddInterventionCostBreakdownLine}
                >
                    {formatMessage(MESSAGES.addInterventionCostBreakdownLine)}
                </Button>
            </Box>
        </Box>
    ) : null;
};

type RowProps = {
    costBreakdownLine: any;
    onUpdateField: (field: string, value: any) => void;
    onRemove: () => void;
    getErrors: (keyValue: string) => string[];
};

export const InterventionCostBreakdownLineForm: FC<RowProps> = ({
    costBreakdownLine = {},
    onUpdateField,
    onRemove = noOp,
    getErrors,
}) => {
    const { data: interventionCostCategories = [] } =
        useGetInterventionCostBreakdownLineCategories();

    const { data: interventionCostUnitTypes = [] } =
        useGetInterventionCostUnitTypes();

    return (
        <Box sx={{ marginBottom: 4 }}>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: 2,
                    marginBottom: 2,
                }}
            >
                <IconButton
                    onClick={() => onRemove()}
                    overrideIcon={RemoveCircleOutlineIcon}
                    tooltipMessage={
                        MESSAGES.removeInterventionCostBreakdownLine
                    }
                ></IconButton>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 2,
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
                    />
                    <InputComponent
                        type="select"
                        keyValue="category"
                        multi={false}
                        withMarginTop={false}
                        wrapperSx={{ flexGrow: 1 }}
                        clearable={false}
                        options={interventionCostCategories}
                        value={costBreakdownLine.category}
                        onChange={onUpdateField}
                        label={MESSAGES.detailedCostCategoryLabel}
                        errors={getErrors('category')}
                    />
                </Box>
                <InputComponent
                    type="number"
                    keyValue="unit_cost"
                    onChange={onUpdateField}
                    required
                    withMarginTop={false}
                    label={MESSAGES.detailedCostUnitLabel}
                    wrapperSx={{ width: '95px' }}
                    value={costBreakdownLine.unit_cost}
                    errors={getErrors('unit_cost')}
                    numberInputOptions={{ decimalScale: 2 }}
                />
            </Box>

            <InputComponent
                type="select"
                keyValue="unit_type"
                multi={false}
                withMarginTop={false}
                wrapperSx={{ marginLeft: '56px' }}
                clearable={false}
                options={interventionCostUnitTypes}
                value={costBreakdownLine.unit_type}
                onChange={onUpdateField}
                label={MESSAGES.unit}
                errors={getErrors('unit')}
            />
        </Box>
    );
};
