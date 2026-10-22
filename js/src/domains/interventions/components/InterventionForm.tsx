import React, { FC, useCallback, useMemo } from 'react';
import { Stack } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useTranslatedErrors } from 'Iaso/libs/validation';
import { DropdownOptions } from 'Iaso/types/utils';
import { useGetExtendedFormikContext } from '../../../hooks/useGetExtendedFormikContext';
import { MESSAGES } from '../../messages';
import { useGetImpactRefs } from '../hooks/useGetImpactRefs';
import { InterventionFormValues } from '../types/interventionForm';

const NO_IMPACT_REF = '__no_impact_ref__';

type Props = {
    grantOptions: DropdownOptions<number>[];
};

const styles = {
    field: { flex: '1 1 0', minWidth: 0 },
};

export const InterventionForm: FC<Props> = ({ grantOptions }) => {
    const { formatMessage } = useSafeIntl();

    const { values, errors, touched, setFieldValueAndState } =
        useGetExtendedFormikContext<InterventionFormValues>();

    const getErrors = useTranslatedErrors({
        errors,
        touched,
        formatMessage,
        messages: MESSAGES,
    });

    const { data: impactRefs } = useGetImpactRefs();

    const impactRefOptions: DropdownOptions<string>[] | undefined =
        useMemo(() => {
            const refs = impactRefs?.refs ?? [];
            if (refs.length === 0) return undefined;
            const options = [
                {
                    label: formatMessage(MESSAGES.noImpactRefOption),
                    value: NO_IMPACT_REF,
                },
                ...refs.map(({ ref, label }) => ({ label, value: ref })),
            ];
            const currentRef = values.impact_ref;
            if (currentRef && !refs.some(({ ref }) => ref === currentRef)) {
                options.push({
                    label: formatMessage(MESSAGES.unknownImpactRefOption, {
                        ref: currentRef,
                    }),
                    value: currentRef,
                });
            }
            return options;
        }, [impactRefs, values.impact_ref, formatMessage]);

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
            {impactRefOptions ? (
                <InputComponent
                    keyValue="impact_ref"
                    type="select"
                    multi={false}
                    clearable={false}
                    options={impactRefOptions}
                    value={values.impact_ref || NO_IMPACT_REF}
                    onChange={handleImpactRefChange}
                    errors={getErrors('impact_ref')}
                    labelString={formatMessage(MESSAGES.impactRefLabel)}
                    wrapperSx={styles.field}
                />
            ) : (
                <InputComponent
                    keyValue="impact_ref"
                    type="text"
                    value={values.impact_ref}
                    onChange={setFieldValueAndState}
                    errors={getErrors('impact_ref')}
                    labelString={formatMessage(MESSAGES.impactRefLabel)}
                    wrapperSx={styles.field}
                />
            )}
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
