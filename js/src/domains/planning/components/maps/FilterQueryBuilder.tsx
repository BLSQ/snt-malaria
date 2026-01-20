import React, { FC, useCallback, useMemo, useState } from 'react';
import { Box, Button } from '@mui/material';
import {
    JsonLogicTree,
    JsonLogicResult,
    Settings,
} from '@react-awesome-query-builder/mui';

import { QueryBuilder, SimpleModal, useSafeIntl } from 'bluesquare-components';

import { MESSAGES } from '../../../messages';
import { useGetMetricCategories } from '../../hooks/useGetMetrics';
import { ScaleDomainRange } from '../../types/metrics';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (value: any) => void;
};

export const FilterQueryBuilder: FC<Props> = ({
    isOpen,
    onClose,
    onSubmit,
}) => {
    const { formatMessage } = useSafeIntl();
    const { data: metricCategories, isLoading } = useGetMetricCategories();
    const [currentFilter, setCurrentFilter] = useState<
        JsonLogicTree | undefined
    >();

    const getFieldForMetric = (
        label,
        legendType: string,
        legend_config: ScaleDomainRange,
    ) => {
        if (legendType === 'ordinal') {
            return {
                label,
                type: 'select',
                valueSources: ['value'],
                operators: ['select_equals', 'select_not_equals'],
                defaultOperator: 'select_equals',
                fieldSettings: {
                    listValues: legend_config.domain.map(
                        (d: string | number) => ({
                            value: d,
                            title: d,
                        }),
                    ),
                },
            };
        }

        return {
            label,
            type: 'number',
            operators: ['greater_or_equal', 'greater', 'less_or_equal', 'less'],
            defaultOperator: 'greater_or_equal',
            valueSources: ['value'],
        };
    };

    // NOTE: I attempted to Select with metrics grouped per category (like in
    // the mockups), but I couldn't get it to work.
    const fields = useMemo(() => {
        const result = {};
        metricCategories?.forEach(category => {
            category.items.forEach(metric => {
                result[metric.id] = getFieldForMetric(
                    `${category.name} - ${metric.name}`,
                    metric.legend_type,
                    metric.legend_config,
                );
            });
        });
        return result;
    }, [metricCategories]);

    const settings = {
        maxNesting: 2,
        showNot: false,
    } as Settings;

    const handleChangeCurrentFilter = (result: JsonLogicResult) => {
        setCurrentFilter(result?.logic);
    };

    const SubmitButton = useCallback(
        () => (
            <Button
                onClick={() => onSubmit(currentFilter)}
                variant="contained"
                color="primary"
                disabled={isLoading || !currentFilter}
            >
                {formatMessage(MESSAGES.selectOrgUnitsBtn)}
            </Button>
        ),
        [currentFilter, isLoading, onSubmit, formatMessage],
    );

    return (
        <SimpleModal
            buttons={SubmitButton}
            open={isOpen}
            onClose={() => null}
            id="PaymentLotEditionDialog"
            dataTestId="PaymentLotEditionDialog"
            titleMessage=""
            closeDialog={onClose}
            maxWidth="xl"
        >
            <Box mt={2} ml={2} mb={4}>
                <QueryBuilder
                    logic={currentFilter}
                    fields={fields}
                    settings={settings}
                    onChange={handleChangeCurrentFilter}
                />
            </Box>
        </SimpleModal>
    );
};
