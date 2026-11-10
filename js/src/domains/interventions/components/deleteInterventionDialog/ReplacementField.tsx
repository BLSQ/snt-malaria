import React, { FC, useCallback } from 'react';
import { Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { numericValues } from 'Iaso/domains/instances/utils/intl';
import { MESSAGES } from '../../../messages';
import {
    CategorySelectOption,
    useCategoryHeaderRenderOption,
} from './useCategoryHeaderRenderOption';

type Props = {
    options: CategorySelectOption[];
    replacement?: CategorySelectOption;
    onChange: (replacementId?: number) => void;
    interventionName: string;
    ruleCount: number;
};

export const ReplacementField: FC<Props> = ({
    options,
    replacement,
    onChange,
    interventionName,
    ruleCount,
}) => {
    const { formatMessage } = useSafeIntl();
    const renderOption = useCategoryHeaderRenderOption();

    const handleChange = useCallback(
        (_key: string, value: number | null) => onChange(value ?? undefined),
        [onChange],
    );

    return (
        <>
            <InputComponent
                keyValue="replacement"
                type="select"
                multi={false}
                clearable={false}
                options={options}
                value={replacement?.value}
                onChange={handleChange}
                renderOption={renderOption}
                placeholder={formatMessage(
                    MESSAGES.deleteInterventionSelectReplacement,
                )}
                withMarginTop={false}
            />
            <Typography variant="caption" color="text.secondary">
                {replacement
                    ? formatMessage(
                          MESSAGES.deleteInterventionReplaceChosenHelper,
                          {
                              name: interventionName,
                              replacement: replacement.label,
                              ...numericValues({ ruleCount }),
                          },
                      )
                    : formatMessage(MESSAGES.deleteInterventionReplaceHelper)}
            </Typography>
        </>
    );
};
