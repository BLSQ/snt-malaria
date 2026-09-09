import React, { FC, useCallback, useEffect, useMemo } from 'react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { SxStyles } from 'Iaso/types/general';
import { useGetExtendedFormikContext } from '../../../hooks/useGetExtendedFormikContext';
import { openHexaLayerToFormPatch } from '../dataLayerForm/openHexaAutofill';
import { useGetOpenHexaDataLayers } from '../hooks/useGetOpenHexaDataLayers';
import { MESSAGES } from '../messages';
import { MetricTypeFormModel, OpenHexaDataLayer } from '../types/metrics';

const styles: SxStyles = {
    hint: { display: 'block', mt: 0.5 },
    alert: { mt: 1, '& ul': { m: 0, pl: 2.5 } },
    details: {
        mt: 2,
        p: 1.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
    },
    detailsTitle: { fontWeight: 600, mb: 1 },
    row: { justifyContent: 'space-between', gap: 2 },
    rowLabel: { color: 'text.secondary', flexShrink: 0 },
    rowValue: { textAlign: 'right', wordBreak: 'break-word' },
};

type Props = {
    existingCodes: Set<string>;
};

/** Trimmed copy of the OpenHexa branch of `DataLayerForm`, for the wizard's Details
 *  step: pick a source layer, its metadata + default legend then fill the form. */
export const OpenHexaSourcePicker: FC<Props> = ({ existingCodes }) => {
    const { formatMessage } = useSafeIntl();
    const { values, setFieldValueAndState } =
        useGetExtendedFormikContext<MetricTypeFormModel>();

    const {
        data: openHexaDataLayers,
        isFetching,
        isError,
    } = useGetOpenHexaDataLayers(true);

    const [importable, unimportable, alreadyImported] = useMemo(() => {
        const yes: OpenHexaDataLayer[] = [];
        const no: OpenHexaDataLayer[] = [];
        const done: OpenHexaDataLayer[] = [];
        (openHexaDataLayers ?? []).forEach(layer => {
            if (existingCodes.has(layer.code)) done.push(layer);
            else if (layer.error) no.push(layer);
            else yes.push(layer);
        });
        return [yes, no, done];
    }, [openHexaDataLayers, existingCodes]);

    const applyLayer = useCallback(
        (layer?: OpenHexaDataLayer) => {
            if (!layer) return;
            Object.entries(openHexaLayerToFormPatch(layer)).forEach(
                ([field, value]) => setFieldValueAndState(field, value),
            );
        },
        [setFieldValueAndState],
    );

    const onSelect = useCallback(
        (_key: string, code: string) =>
            applyLayer(importable.find(layer => layer.code === code)),
        [importable, applyLayer],
    );

    useEffect(() => {
        if (!values.code && importable.length > 0) {
            applyLayer(importable[0]);
        }
    }, [values.code, importable, applyLayer]);

    const detailRows: { label: string; value?: string }[] = [
        { label: formatMessage(MESSAGES.variable), value: values.code },
        { label: formatMessage(MESSAGES.category), value: values.category },
        { label: formatMessage(MESSAGES.units), value: values.units },
        {
            label: formatMessage(MESSAGES.unitSymbol),
            value: values.unit_symbol,
        },
        {
            label: formatMessage(MESSAGES.legendType),
            value: values.legend_type,
        },
        {
            label: formatMessage(MESSAGES.description),
            value: values.description,
        },
    ].filter(row => Boolean(row.value));

    return (
        <div>
            <InputComponent
                type="select"
                keyValue="openHexaDataLayer"
                required
                clearable={false}
                options={importable.map(layer => ({
                    label: layer.name,
                    value: layer.code,
                }))}
                value={values.code || null}
                onChange={onSelect}
                label={MESSAGES.openHexaDataLayer}
                loading={isFetching}
                errors={
                    isError
                        ? [formatMessage(MESSAGES.openHexaDataLayersError)]
                        : []
                }
            />
            <Typography
                variant="caption"
                color="text.secondary"
                sx={styles.hint}
            >
                {formatMessage(MESSAGES.openHexaDataLayerHelp)}
            </Typography>
            {values.code && detailRows.length > 0 && (
                <Box sx={styles.details}>
                    <Typography variant="body2" sx={styles.detailsTitle}>
                        {formatMessage(MESSAGES.wizardOpenHexaSourceDetails)}
                    </Typography>
                    <Stack spacing={0.75}>
                        {React.Children.toArray(
                            detailRows.map(row => (
                                <Stack direction="row" sx={styles.row}>
                                    <Typography
                                        variant="caption"
                                        sx={styles.rowLabel}
                                    >
                                        {row.label}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={styles.rowValue}
                                    >
                                        {row.value}
                                    </Typography>
                                </Stack>
                            )),
                        )}
                    </Stack>
                </Box>
            )}
            {alreadyImported.length > 0 && (
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={styles.hint}
                >
                    {formatMessage(MESSAGES.openHexaLayersAlreadyImported, {
                        layers: alreadyImported
                            .map(layer => layer.name)
                            .join(', '),
                    })}
                </Typography>
            )}
            {unimportable.length > 0 && (
                <Alert severity="warning" sx={styles.alert}>
                    {formatMessage(MESSAGES.openHexaLayersUnimportable)}
                    <ul>
                        {React.Children.toArray(
                            unimportable.map(layer => (
                                <li>
                                    <strong>{layer.name}</strong>: {layer.error}
                                </li>
                            )),
                        )}
                    </ul>
                </Alert>
            )}
            <Typography
                variant="caption"
                color="text.secondary"
                sx={styles.hint}
            >
                {formatMessage(MESSAGES.wizardOpenHexaManualRefresh)}
            </Typography>
        </div>
    );
};
