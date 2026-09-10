import React, { FC, useCallback, useEffect, useMemo } from 'react';
import { Alert, Box, Typography } from '@mui/material';
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
};

type Props = {
    existingCodes: Set<string>;
};

/** Picks a source layer from OpenHexa and autofills the form with its metadata +
 *  default legend; the picked values then show read-only in the field set below
 *  (see `StepDetails`), same as it does when editing an existing OpenHexa layer. */
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

    return (
        <Box>
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
        </Box>
    );
};
