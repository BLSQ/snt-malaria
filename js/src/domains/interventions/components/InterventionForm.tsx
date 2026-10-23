import React, { FC, useCallback, useMemo } from 'react';
import { Stack } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useTranslatedErrors } from 'Iaso/libs/validation';
import { DropdownOptions } from 'Iaso/types/utils';
import { useGetExtendedFormikContext } from '../../../hooks/useGetExtendedFormikContext';
import { MESSAGES } from '../../messages';
import { ImpactRefOption } from '../types/intervention';
import { InterventionFormValues } from '../types/interventionForm';

const NO_IMPACT_REF = '__no_impact_ref__';

type Props = {
    grantOptions: DropdownOptions<number>[];
    impactRefs?: ImpactRefOption[];
    isFetchingImpactRefs: boolean;
};

const styles = {
    field: { flex: '1 1 0', minWidth: 0 },
};

export const InterventionForm: FC<Props> = ({
    grantOptions,
    impactRefs,
    isFetchingImpactRefs,
}) => {
    const { formatMessage } = useSafeIntl();

    const { values, errors, touched, setFieldValueAndState } =
        useGetExtendedFormikContext<InterventionFormValues>();

    const getErrors = useTranslatedErrors({
        errors,
        touched,
        formatMessage,
        messages: MESSAGES,
    });

    const isUnknownImpactRef = Boolean(
        impactRefs?.length &&
        values.impact_ref &&
        !impactRefs.some(({ ref }) => ref === values.impact_ref),
    );

    const impactRefOptions: DropdownOptions<string>[] | undefined =
        useMemo(() => {
            if (!impactRefs?.length) return undefined;
            const options = [
                {
                    label: formatMessage(MESSAGES.noImpactRefOption),
                    value: NO_IMPACT_REF,
                },
                ...impactRefs.map(({ ref, label }) => ({ label, value: ref })),
            ];
            if (isUnknownImpactRef) {
                options.push({
                    label: values.impact_ref,
                    value: values.impact_ref,
                });
            }
            return options;
        }, [impactRefs, isUnknownImpactRef, values.impact_ref, formatMessage]);

    const handleImpactRefChange = useCallback(
        (field: string, value?: string | null) =>
            setFieldValueAndState(
                field,
                !value || value === NO_IMPACT_REF ? '' : value,
            ),
        [setFieldValueAndState],
    );

    const handleGrantChange = useCallback(
        (field: string, value?: number | null) =>
            setFieldValueAndState(field, value ?? null),
        [setFieldValueAndState],
    );

    return (
        <Stack spacing={2} direction="row">
            <InputComponent
                keyValue="impact_ref"
                type="select"
                multi={false}
                clearable={false}
                disabled={!impactRefOptions}
                options={impactRefOptions ?? []}
                value={
                    impactRefOptions
                        ? values.impact_ref || NO_IMPACT_REF
                        : undefined
                }
                onChange={handleImpactRefChange}
                errors={
                    isUnknownImpactRef
                        ? [formatMessage(MESSAGES.unknownImpactRef)]
                        : getErrors('impact_ref')
                }
                helperText={
                    !impactRefOptions && !isFetchingImpactRefs
                        ? formatMessage(MESSAGES.noImpactProviderConfigured)
                        : undefined
                }
                labelString={formatMessage(MESSAGES.impactRefLabel)}
                wrapperSx={styles.field}
            />
            <InputComponent
                keyValue="grant"
                type="select"
                multi={false}
                clearable
                options={grantOptions}
                value={values.grant}
                onChange={handleGrantChange}
                errors={getErrors('grant')}
                labelString={formatMessage(MESSAGES.interventionGrant)}
                wrapperSx={styles.field}
            />
        </Stack>
    );
};
