import React, { useCallback, useEffect, useMemo } from 'react';
import { FC } from 'react';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { Box, Button, Typography } from '@mui/material';
import { IconButton, useSafeIntl } from 'bluesquare-components';
import { FormikErrors, FormikTouched } from 'formik';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { DropdownOptions } from 'Iaso/types/utils';
import { noOp } from 'Iaso/utils';
import { useGetCostBreakdownLineCategories } from '../../hooks/useGetCostBreakdownLineCategories';
import { MESSAGES } from '../../messages';
import { CostBreakdownLine } from '../../types/CostBreakdownLine';

type Props = {
    onUpdateField: (field: string, value: any) => void;
    costBreakdownLines: CostBreakdownLine[];
    onAddCostBreakdownLine: () => void;
    onRemoveCostBreakdownLine: (index: number) => void;
    onTotalCostChanges: (totalCost: number) => void;
    touched: FormikTouched<CostBreakdownLine>[] | undefined;
    errors: string | string[] | FormikErrors<CostBreakdownLine>[] | undefined;
};

export const CostBreakdownLinesForm: FC<Props> = ({
    costBreakdownLines,
    onUpdateField,
    onAddCostBreakdownLine,
    onRemoveCostBreakdownLine,
    onTotalCostChanges,
    errors,
    touched,
}) => {
    const { formatMessage } = useSafeIntl();
    const totalCost = useMemo(
        () =>
            costBreakdownLines?.reduce(
                (total, costBreakdownLine) =>
                    total + (costBreakdownLine.cost ?? 0),
                0,
            ),
        [costBreakdownLines],
    );

    useEffect(
        () => onTotalCostChanges(totalCost),
        [totalCost, onTotalCostChanges],
    );

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
                <CostBreakdownLineForm
                    key={`cost-details-row-${cd.id}`}
                    costBreakdownLine={cd}
                    onUpdateField={(field, value) =>
                        onUpdateField(
                            `cost_breakdown_lines[${index}].${field}`,
                            value,
                        )
                    }
                    onRemove={() => onRemoveCostBreakdownLine(index)}
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
                <Button variant="text" onClick={onAddCostBreakdownLine}>
                    {formatMessage(MESSAGES.addCostBreakdownLine)}
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
    costBreakdownLine: any;
    onUpdateField: (field: string, value: any) => void;
    onRemove: () => void;
    getErrors: (keyValue: string) => string[];
};

export const CostBreakdownLineForm: FC<RowProps> = ({
    costBreakdownLine = {},
    onUpdateField,
    onRemove = noOp,
    getErrors,
}) => {
    const { data: interventionCostCategories = [] } =
        useGetCostBreakdownLineCategories<DropdownOptions<any>[]>(data =>
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
                tooltipMessage={MESSAGES.removeCostBreakdownLine}
            ></IconButton>
            <Box
                sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}
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
                keyValue="cost"
                onChange={onUpdateField}
                required
                withMarginTop={false}
                label={MESSAGES.detailedCostUnitLabel}
                wrapperSx={{ width: '95px' }}
                value={costBreakdownLine.cost}
                errors={getErrors('cost')}
            />
        </Box>
    );
};
