import React, { FC } from 'react';
import { Box, Stack } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { useDataLayerComparisonContext } from '../contexts/DataLayerComparisonContext';
import { DataLayerMapWrapper } from '../dataLayerMap/DataLayerMapWrapper';

const styles = {
    stack: {
        maxHeight: '100%',
        overflow: 'auto',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        width: '33%',
    },
    items: {
        minHeight: '50%',
        height: '50%',
    },
} satisfies SxStyles;

export const DataLayerComparisonContainer: FC = ({}) => {
    const { orgUnits, comparisonMetricTypes, removeMetricFromComparison } =
        useDataLayerComparisonContext();
    return comparisonMetricTypes?.length <= 0 ? null : (
        <Stack direction="column" sx={styles.stack} gap={2}>
            {React.Children.toArray(
                comparisonMetricTypes.map((metricType, index) => (
                    <Box sx={styles.items}>
                        <DataLayerMapWrapper
                            orgUnits={orgUnits}
                            metricType={metricType}
                            small={true}
                            onRemove={() =>
                                removeMetricFromComparison(
                                    metricType?.id,
                                    index,
                                )
                            }
                        />
                    </Box>
                )),
            )}
        </Stack>
    );
};
