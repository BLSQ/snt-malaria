import React, { useCallback, useMemo, useState } from 'react';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Box, Button, Collapse, Typography } from '@mui/material';
import { IconButton, useSafeIntl } from 'bluesquare-components';
import { useFormikContext } from 'formik';
import { DeleteIconButton } from 'Iaso/components/Buttons/DeleteIconButton';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useTranslatedErrors } from 'Iaso/libs/validation';
import { SxStyles } from 'Iaso/types/general';
import { LayerSelect } from '../../../components/LayerSelect';
import { YearRangeSlider } from '../../../components/YearRangeSlider';
import { DataLayerYearOptions } from '../../../constants/shared';
import {
    flattenMetricTypes,
    useGetMetricCategories,
} from '../../dataLayers/hooks/useGetMetrics';
import { MetricType } from '../../dataLayers/types/metrics';
import { MESSAGES } from '../../messages';
import {
    SCENARIO_YEAR_RANGE,
    ScenarioFormValues,
} from '../hooks/useScenarioFormState';

const styles = {
    dataLayerRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 0.5,
    },
    dataLayerLabel: {
        flexGrow: 1,
    },
    collapsibleToggle: {
        color: 'text.secondary',
        textTransform: 'none',
    },
    chevron: {
        fontSize: 20,
        transition: 'transform 150ms ease',
    },
    chevronOpen: {
        transform: 'rotate(180deg)',
    },
    yearInput: { width: 94 },
} satisfies SxStyles;

const ScenarioForm: React.FC = () => {
    const { formatMessage } = useSafeIntl();

    const { values, setFieldValue, errors, touched, setFieldTouched } =
        useFormikContext<ScenarioFormValues>();

    const { data: metricCategories = [] } = useGetMetricCategories();
    const metricTypeById = useMemo(
        () =>
            new Map(
                flattenMetricTypes(metricCategories).map(metricType => [
                    metricType.id,
                    metricType,
                ]),
            ),
        [metricCategories],
    );

    const [customizeExpanded, setCustomizeExpanded] = useState(false);
    const [newLayer, setNewLayer] = useState<MetricType | undefined>(undefined);
    const [newLayerYear, setNewLayerYear] = useState<number | undefined>(
        undefined,
    );

    const setFieldValueAndState = useCallback(
        (field: string, value: any) => {
            setFieldTouched(field, true);
            setFieldValue(field, value);
        },
        [setFieldTouched, setFieldValue],
    );

    const getErrors = useTranslatedErrors({
        errors,
        touched,
        formatMessage,
        messages: MESSAGES,
    });

    const onYearRangeChange = useCallback(
        (yearRange: [number, number]) => {
            setFieldTouched('start_year', true);
            setFieldTouched('end_year', true);
            setFieldValue('start_year', yearRange[0]);
            setFieldValue('end_year', yearRange[1]);
        },
        [setFieldTouched, setFieldValue],
    );

    const onChangeDataLayerYear = useCallback(
        (metricTypeId: number, year: number | undefined) => {
            const next = { ...values.data_layer_years };
            if (year === undefined || year === null) {
                delete next[String(metricTypeId)];
            } else {
                next[String(metricTypeId)] = year;
            }
            setFieldTouched('data_layer_years', true);
            setFieldValue('data_layer_years', next);
        },
        [values.data_layer_years, setFieldTouched, setFieldValue],
    );

    const onAddDataLayerYear = useCallback(() => {
        if (newLayer === undefined || newLayerYear === undefined) {
            return;
        }
        onChangeDataLayerYear(newLayer.id, newLayerYear);
        setNewLayer(undefined);
        setNewLayerYear(undefined);
    }, [newLayer, newLayerYear, onChangeDataLayerYear]);

    const availableMetricCategories = useMemo(
        () =>
            metricCategories
                .map(category => ({
                    ...category,
                    items: category.items.filter(
                        item =>
                            values.data_layer_years[String(item.id)] ===
                            undefined,
                    ),
                }))
                .filter(category => category.items.length > 0),
        [metricCategories, values.data_layer_years],
    );

    const yearRangeValue: [number, number] = [
        values.start_year ?? SCENARIO_YEAR_RANGE.min,
        values.end_year ?? SCENARIO_YEAR_RANGE.max,
    ];

    const yearErrors = [...getErrors('start_year'), ...getErrors('end_year')];

    return (
        <Box>
            <InputComponent
                keyValue="name"
                onChange={setFieldValueAndState}
                value={values.name}
                type="text"
                label={MESSAGES.name}
                required
                errors={getErrors('name')}
            />
            <InputComponent
                keyValue="description"
                onChange={setFieldValueAndState}
                value={values.description}
                type="text"
                label={MESSAGES.description}
                errors={getErrors('description')}
            />
            <Box mt={2}>
                <Typography variant="caption" color="text.secondary">
                    {formatMessage(MESSAGES.yearsLabel)}
                </Typography>
                <YearRangeSlider
                    yearRange={[
                        SCENARIO_YEAR_RANGE.min,
                        SCENARIO_YEAR_RANGE.max,
                    ]}
                    value={yearRangeValue}
                    onChange={onYearRangeChange}
                />
                {yearErrors.map(error => (
                    <Typography
                        key={`${error}`}
                        variant="caption"
                        color="error"
                        display="block"
                    >
                        {error}
                    </Typography>
                ))}
            </Box>
            <Box mt={2}>
                <InputComponent
                    type="select"
                    keyValue="reference_year"
                    label={MESSAGES.referenceYearLabel}
                    value={values.reference_year ?? null}
                    onChange={(_field, value) =>
                        setFieldValueAndState(
                            'reference_year',
                            value ?? undefined,
                        )
                    }
                    options={DataLayerYearOptions}
                    helperText={formatMessage(MESSAGES.referenceYearHelp)}
                    withMarginTop={false}
                />
            </Box>
            <Box mt={2}>
                <Button
                    size="small"
                    sx={styles.collapsibleToggle}
                    onClick={() => setCustomizeExpanded(prev => !prev)}
                    endIcon={
                        <ExpandMoreIcon
                            sx={[
                                styles.chevron,
                                customizeExpanded && styles.chevronOpen,
                            ]}
                        />
                    }
                >
                    <Typography variant="caption" color="text.secondary">
                        {formatMessage(MESSAGES.customizeDataLayerYears)}
                    </Typography>
                </Button>
                <Collapse in={customizeExpanded}>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        gutterBottom
                    >
                        {formatMessage(MESSAGES.dataLayerYearsHelp)}
                    </Typography>
                    {Object.entries(values.data_layer_years).map(
                        ([metricTypeId, year]) => (
                            <Box sx={styles.dataLayerRow} key={metricTypeId}>
                                <Typography
                                    variant="body2"
                                    color="textSecondary"
                                    sx={styles.dataLayerLabel}
                                    noWrap
                                >
                                    {metricTypeById.get(Number(metricTypeId))
                                        ?.name ?? metricTypeId}
                                </Typography>
                                <InputComponent
                                    type="select"
                                    keyValue={metricTypeId}
                                    clearable={false}
                                    value={year}
                                    onChange={(_field, value) =>
                                        onChangeDataLayerYear(
                                            Number(metricTypeId),
                                            value ?? undefined,
                                        )
                                    }
                                    options={DataLayerYearOptions}
                                    wrapperSx={styles.yearInput}
                                    withMarginTop={false}
                                />
                                <DeleteIconButton
                                    onClick={() =>
                                        onChangeDataLayerYear(
                                            Number(metricTypeId),
                                            undefined,
                                        )
                                    }
                                    message={MESSAGES.remove}
                                />
                            </Box>
                        ),
                    )}
                    {availableMetricCategories.length > 0 && (
                        <Box sx={styles.dataLayerRow}>
                            <Box sx={{ flexGrow: 1 }}>
                                <LayerSelect
                                    variant="form"
                                    placeholder={MESSAGES.selectDataLayer}
                                    metricCategories={availableMetricCategories}
                                    initialSelection={newLayer}
                                    onLayerChange={setNewLayer}
                                />
                            </Box>
                            <InputComponent
                                type="select"
                                keyValue="newDataLayerYear"
                                label={MESSAGES.year}
                                value={newLayerYear ?? null}
                                onChange={(_field, value) =>
                                    setNewLayerYear(value ?? undefined)
                                }
                                options={DataLayerYearOptions}
                                wrapperSx={styles.yearInput}
                                withMarginTop={false}
                                clearable={false}
                            />
                            <IconButton
                                onClick={onAddDataLayerYear}
                                tooltipMessage={MESSAGES.add}
                                overrideIcon={AddCircleOutlineOutlinedIcon}
                                disabled={
                                    newLayer === undefined ||
                                    newLayerYear === undefined
                                }
                            />
                        </Box>
                    )}
                    {metricCategories.length === 0 && (
                        <Typography variant="body2" color="textSecondary">
                            {formatMessage(MESSAGES.noDataLayersFound)}
                        </Typography>
                    )}
                </Collapse>
            </Box>
        </Box>
    );
};

export default ScenarioForm;
