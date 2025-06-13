import React, { FC, useMemo, useState } from 'react';
import { Box, Button } from '@mui/material';
import {
    JsonLogicTree,
    JsonLogicResult,
} from '@react-awesome-query-builder/mui';

import { QueryBuilder, SimpleModal, useSafeIntl } from 'bluesquare-components';
import { defineMessages } from 'react-intl';

import { useGetMetricCategories } from '../../hooks/useGetMetrics';

export const MESSAGES = defineMessages({
    applyFilter: {
        id: 'iaso.snt_malaria.label.applyFilter',
        defaultMessage: 'Select districts',
    },
    isAbove: {
        id: 'iaso.snt_malaria.label.isAbove',
        defaultMessage: 'is above',
    },
});

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

    // NOTE: I attempted to Select with metrics grouped per category (like in
    // the mockups), but I couldn't get it to work.
    const fields = useMemo(() => {
        const result = {};
        metricCategories?.forEach(category => {
            category.items.forEach(metric => {
                result[metric.id] = {
                    label: `${category.name} - ${metric.name}`,
                    type: 'number',
                    operators: ['greater_or_equal'],
                    defaultOperator: 'greater_or_equal',
                    valueSources: ['value'],
                };
            });
        });
        return result;
    }, [metricCategories]);

    const handleChangeCurrentFilter = (result: JsonLogicResult) => {
        setCurrentFilter(result?.logic);
    };

    const SubmitButton = () => {
        return (
            <Button
                onClick={() => onSubmit(currentFilter)}
                variant="contained"
                color="primary"
                disabled={isLoading || !currentFilter}
            >
                {formatMessage(MESSAGES.applyFilter)}
            </Button>
        );
    };

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
                    onChange={handleChangeCurrentFilter}
                />
            </Box>
        </SimpleModal>
    );
};
