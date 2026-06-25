import React, { FC, useCallback, useMemo } from 'react';
import CheckIcon from '@mui/icons-material/Check';
import SettingsInputCompositeOutlinedIcon from '@mui/icons-material/SettingsInputCompositeOutlined';
import { Stack, Typography } from '@mui/material';
import { Button } from '@mui/material';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useFormik } from 'formik';
import { CardStyled } from '../../../components/CardStyled';
import { IconBoxed } from '../../../components/IconBoxed';
import {
    CardScrollable,
    SettingsFormContainer,
} from '../../../components/styledComponents';
import { useGetMetricTypes } from '../../dataLayers/hooks/useGetMetrics';
import { MetricType } from '../../dataLayers/types/metrics';
import { MESSAGES } from '../../messages';
import { useGetAccountSettings } from '../../planning/hooks/useGetAccountSettings';
import { useGetOrgUnitTypes } from '../../configureAccount/hooks/useGetOrgUnitTypes';
import { useSaveAccountSettingsTab } from './hooks/useSaveAccountSettingsTab';

type FormValues = {
    focus_org_unit_type_id: number | null;
    intervention_org_unit_type_id: number | null;
    default_population_id: number | null;
};

export const AccountSettingsTab: FC = () => {
    const { formatMessage } = useSafeIntl();

    const { data: accountSettings, isLoading } = useGetAccountSettings();
    const { data: orgUnitTypes, isFetching: isFetchingTypes } =
        useGetOrgUnitTypes(true);
    const { data: allMetricTypes, isFetching: isFetchingMetrics } =
        useGetMetricTypes();

    const populationMetricOptions = useMemo(
        () =>
            (allMetricTypes ?? ([] as MetricType[]))
                .filter(mt => mt.metric_kind === 'population')
                .map(mt => ({ value: mt.id, label: mt.name })),
        [allMetricTypes],
    );

    const { mutate: save, isLoading: isSaving } = useSaveAccountSettingsTab();

    const initialValues = useMemo<FormValues>(
        () => ({
            focus_org_unit_type_id:
                accountSettings?.focus_org_unit_type_id ?? null,
            intervention_org_unit_type_id:
                accountSettings?.intervention_org_unit_type_id ?? null,
            default_population_id:
                accountSettings?.default_population_id ?? null,
        }),
        [accountSettings],
    );

    const formik = useFormik<FormValues>({
        initialValues,
        enableReinitialize: true,
        onSubmit: values => {
            if (!accountSettings?.id) return;
            save({
                id: accountSettings.id,
                focus_org_unit_type_id: values.focus_org_unit_type_id,
                intervention_org_unit_type_id:
                    values.intervention_org_unit_type_id,
                default_population_id: values.default_population_id,
            });
        },
    });

    const { values, setFieldValue, setFieldTouched } = formik;

    const onChange = useCallback(
        (keyValue: string | null, value: unknown) => {
            if (!keyValue) return;
            setFieldTouched(keyValue, true);
            const processed =
                value === '' || value === null || value === undefined
                    ? null
                    : Number(value);
            setFieldValue(keyValue, processed);
        },
        [setFieldTouched, setFieldValue],
    );

    return (
        <CardScrollable>
            <CardStyled
                header={
                    <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                    >
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <IconBoxed
                                Icon={SettingsInputCompositeOutlinedIcon}
                            />
                            <Typography variant="h6">
                                {formatMessage(MESSAGES.accountSettingsTitle)}
                            </Typography>
                        </Stack>
                        <Button
                            onClick={() => formik.handleSubmit()}
                            variant="contained"
                            color="primary"
                            startIcon={<CheckIcon />}
                            disabled={isSaving || !accountSettings?.id}
                        >
                            {formatMessage(MESSAGES.save)}
                        </Button>
                    </Stack>
                }
            >
                {isLoading && <LoadingSpinner absolute />}
                <SettingsFormContainer>
                    <Stack spacing={2}>
                        <Typography variant="caption" color="textSecondary">
                            {formatMessage(MESSAGES.accountSettingsSubtitle)}
                        </Typography>
                        <InputComponent
                            type="select"
                            keyValue="intervention_org_unit_type_id"
                            labelString={formatMessage(
                                MESSAGES.settingsInterventionOrgUnitType,
                            )}
                            value={values.intervention_org_unit_type_id}
                            onChange={onChange}
                            options={orgUnitTypes ?? []}
                            loading={isFetchingTypes}
                            clearable
                            withMarginTop={false}
                        />
                        <InputComponent
                            type="select"
                            keyValue="focus_org_unit_type_id"
                            labelString={formatMessage(
                                MESSAGES.settingsFocusOrgUnitType,
                            )}
                            value={values.focus_org_unit_type_id}
                            onChange={onChange}
                            options={orgUnitTypes ?? []}
                            loading={isFetchingTypes}
                            clearable
                            withMarginTop={false}
                        />
                        <InputComponent
                            type="select"
                            keyValue="default_population_id"
                            labelString={formatMessage(
                                MESSAGES.settingsDefaultPopulation,
                            )}
                            helperText={formatMessage(
                                MESSAGES.settingsDefaultPopulationHelp,
                            )}
                            value={values.default_population_id}
                            onChange={onChange}
                            options={populationMetricOptions}
                            loading={isFetchingMetrics}
                            clearable
                            withMarginTop={false}
                        />
                    </Stack>
                </SettingsFormContainer>
            </CardStyled>
        </CardScrollable>
    );
};
