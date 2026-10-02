import React, { FC, useCallback, useMemo, useState } from 'react';
import GroupsIcon from '@mui/icons-material/Groups';
import NumbersIcon from '@mui/icons-material/Numbers';
import {
    Box,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { ConfirmCancelModal, useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { SxStyles } from 'Iaso/types/general';
import { useInterventionContext } from '../../../interventions/contexts/InterventionContext';
import { InterventionCostBreakdownLinePayload } from '../../../interventions/types';
import { formatConversionDirection } from '../../../interventions/utils/costBreakdownLine';
import { MESSAGES } from '../../../messages';
import { CostItemGroup } from '../types';

type Props = {
    group: CostItemGroup;
    initialLine: InterventionCostBreakdownLinePayload;
    onSave: (line: InterventionCostBreakdownLinePayload) => Promise<void>;
    onClose: () => void;
};

type Basis = 'proportional' | 'fixed';

const styles = {
    subtitle: { color: 'text.secondary', mb: 2 },
    fields: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 2,
        alignItems: 'start',
    },
    basisToggle: { height: 40, width: '100%' },
    basisButton: { flex: 1, gap: 0.75, textTransform: 'none' },
    values: { display: 'grid', gap: 2, mt: 2 },
    note: { color: 'text.secondary', mt: 2 },
} satisfies SxStyles;

const isValidLine = (line: InterventionCostBreakdownLinePayload) => {
    const coverage = Number(line.coverage);
    return (
        line.name.trim() !== '' &&
        Boolean(line.unit_type) &&
        line.unit_cost !== undefined &&
        line.unit_cost !== null &&
        (!line.is_proportional ||
            (line.population_layer !== null &&
                coverage >= 0 &&
                coverage <= 100))
    );
};

export const CostItemDialog: FC<Props> = ({
    group,
    initialLine,
    onSave,
    onClose,
}) => {
    const { formatMessage } = useSafeIntl();
    const {
        costCategoryOptions,
        costUnitTypeOptions,
        populationOptions,
        currency,
    } = useInterventionContext();
    const [line, setLine] = useState(initialLine);
    const [isSaving, setIsSaving] = useState(false);

    const isNew = initialLine.id === undefined;

    const updateField = useCallback(
        (field: string, value: unknown) =>
            setLine(previous => ({ ...previous, [field]: value })),
        [],
    );

    const handleBasisChange = useCallback(
        (_event: React.MouseEvent, basis: Basis | null) => {
            if (basis !== null) {
                updateField('is_proportional', basis === 'proportional');
            }
        },
        [updateField],
    );

    const handleDirectionChange = useCallback(
        (_key: string, value: string) =>
            updateField('invert_conversion_factor', value === 'inverse'),
        [updateField],
    );

    const unitLabel =
        costUnitTypeOptions.find(
            option => String(option.value) === String(line.unit_type),
        )?.label ?? formatMessage(MESSAGES.unit);

    const directionOptions = useMemo(
        () =>
            [false, true].map(isInverted => ({
                value: isInverted ? 'inverse' : 'direct',
                label: formatConversionDirection(
                    formatMessage,
                    unitLabel,
                    line.conversion_factor,
                    isInverted,
                ),
            })),
        [formatMessage, unitLabel, line.conversion_factor],
    );

    const handleConfirm = useCallback(async () => {
        setIsSaving(true);
        try {
            await onSave({ ...line, name: line.name.trim() });
            onClose();
        } catch {
            setIsSaving(false);
        }
    }, [line, onSave, onClose]);

    return (
        <ConfirmCancelModal
            open
            maxWidth="sm"
            id="cost-item-dialog"
            dataTestId="cost-item-dialog"
            titleMessage={
                isNew
                    ? MESSAGES.addInterventionCostBreakdownLine
                    : MESSAGES.editCostItem
            }
            onClose={onClose}
            closeDialog={onClose}
            onConfirm={handleConfirm}
            onCancel={onClose}
            confirmMessage={MESSAGES.save}
            cancelMessage={MESSAGES.cancel}
            allowConfirm={isValidLine(line) && !isSaving}
            closeOnConfirm={false}
        >
            <Typography variant="body2" sx={styles.subtitle}>
                {group.intervention.name}, {group.interventionCategory.name}
            </Typography>
            <Box sx={styles.fields}>
                <InputComponent
                    type="text"
                    keyValue="name"
                    value={line.name}
                    onChange={updateField}
                    label={MESSAGES.detailedCostLabel}
                    required
                    withMarginTop={false}
                />
                <InputComponent
                    type="select"
                    keyValue="category"
                    value={line.category}
                    onChange={updateField}
                    options={costCategoryOptions}
                    label={MESSAGES.detailedCostCategoryLabel}
                    clearable={false}
                    withMarginTop={false}
                />
                <InputComponent
                    type="select"
                    keyValue="unit_type"
                    value={line.unit_type}
                    onChange={updateField}
                    options={costUnitTypeOptions}
                    label={MESSAGES.unit}
                    required
                    clearable={false}
                    withMarginTop={false}
                />
                <ToggleButtonGroup
                    exclusive
                    size="small"
                    color="primary"
                    value={line.is_proportional ? 'proportional' : 'fixed'}
                    onChange={handleBasisChange}
                    sx={styles.basisToggle}
                >
                    <ToggleButton value="proportional" sx={styles.basisButton}>
                        <GroupsIcon fontSize="small" />
                        {formatMessage(MESSAGES.fromPopulation)}
                    </ToggleButton>
                    <ToggleButton value="fixed" sx={styles.basisButton}>
                        <NumbersIcon fontSize="small" />
                        {formatMessage(MESSAGES.fixedCount)}
                    </ToggleButton>
                </ToggleButtonGroup>
                {line.is_proportional && (
                    <>
                        <InputComponent
                            type="select"
                            keyValue="population_layer"
                            value={line.population_layer ?? ''}
                            onChange={updateField}
                            options={populationOptions}
                            label={MESSAGES.targetPopulationLabel}
                            required
                            withMarginTop={false}
                        />
                        <InputComponent
                            type="select"
                            keyValue="invert_conversion_factor"
                            value={
                                line.invert_conversion_factor
                                    ? 'inverse'
                                    : 'direct'
                            }
                            onChange={handleDirectionChange}
                            options={directionOptions}
                            label={MESSAGES.costLineDirectionLabel}
                            clearable={false}
                            withMarginTop={false}
                        />
                    </>
                )}
            </Box>

            <Box mt={3}>
                <Typography variant="body1" fontWeight="medium">
                    {formatMessage(MESSAGES.costItemValues)}
                </Typography>
                <Box
                    sx={{
                        ...styles.values,
                        gridTemplateColumns: line.is_proportional
                            ? 'repeat(3, 1fr)'
                            : '1fr',
                    }}
                >
                    <InputComponent
                        type="number"
                        keyValue="unit_cost"
                        value={line.unit_cost}
                        onChange={updateField}
                        label={MESSAGES.budgetingCostLineUnitCost}
                        required
                        withMarginTop={false}
                        numberInputOptions={{ decimalScale: 2, currency }}
                    />
                    {line.is_proportional && (
                        <>
                            <InputComponent
                                type="number"
                                keyValue="conversion_factor"
                                value={line.conversion_factor}
                                onChange={updateField}
                                label={
                                    MESSAGES.budgetingCostLineConversionFactor
                                }
                                withMarginTop={false}
                                numberInputOptions={{ decimalScale: 6 }}
                            />
                            <InputComponent
                                type="number"
                                keyValue="coverage"
                                value={line.coverage}
                                onChange={updateField}
                                label={MESSAGES.coverageLabel}
                                withMarginTop={false}
                                numberInputOptions={{
                                    decimalScale: 2,
                                    min: 0,
                                    max: 100,
                                    suffix: '%',
                                }}
                            />
                        </>
                    )}
                </Box>
            </Box>

            {!line.is_proportional && (
                <Typography variant="body2" sx={styles.note}>
                    {formatMessage(MESSAGES.fixedCountNote)}
                </Typography>
            )}
        </ConfirmCancelModal>
    );
};
