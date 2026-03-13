import React, { FC, useCallback, useState } from 'react';
import { Card, Grid } from '@mui/material';
import { LoadingSpinner, TopBar, useSafeIntl } from 'bluesquare-components';
import { CardStyled } from '../../components/CardStyled';
import {
    PageContainer,
    PaperFullHeight,
} from '../../components/styledComponents';
import { useGetMetricCategories } from '../planning/hooks/useGetMetrics';
import { MetricType } from '../planning/types/metrics';
import { DataLayerDialog } from './dataLayerForm/DataLayerDialog';
import { DataLayerList } from './dataLayerList/DataLayerList';
import { DataLayerListHeader } from './dataLayerList/DataLayerListHeader';
import { useDeleteMetricType } from './hooks/useDeleteMetricType';
import { MESSAGES } from './messages';

export const DataLayers: FC = () => {
    const { formatMessage } = useSafeIntl();

    const { data: metricCategories, isLoading: isLoadingMetricLayers } =
        useGetMetricCategories();
    const { mutate: deleteMetricType } = useDeleteMetricType();

    const [isMetricTypeFormOpen, setIsMetricTypeFormOpen] =
        useState<boolean>(false);
    const [selectedMetricType, setSelectedMetricType] = useState<
        MetricType | undefined
    >(undefined);

    const onDialogClose = useCallback(() => {
        setIsMetricTypeFormOpen(false);
        setSelectedMetricType(undefined);
    }, [setIsMetricTypeFormOpen, setSelectedMetricType]);

    const onCreateMetricType = useCallback(() => {
        setSelectedMetricType(undefined);
        setIsMetricTypeFormOpen(true);
    }, [setSelectedMetricType, setIsMetricTypeFormOpen]);

    const onEditMetricType = useCallback(
        (metricType: MetricType) => {
            setSelectedMetricType(metricType);
            setIsMetricTypeFormOpen(true);
        },
        [setSelectedMetricType, setIsMetricTypeFormOpen],
    );

    return (
        <>
            {isLoadingMetricLayers && <LoadingSpinner />}
            <TopBar
                title={formatMessage(MESSAGES.dataLayersTitle)}
                disableShadow
            />
            <PageContainer>
                <Grid container spacing={1}>
                    <Grid item xs={12} md={4}>
                        <PaperFullHeight>
                            <Card>
                                <CardStyled
                                    header={
                                        <DataLayerListHeader
                                            onCreate={onCreateMetricType}
                                        />
                                    }
                                >
                                    <DataLayerList
                                        metricCategories={
                                            metricCategories || []
                                        }
                                        onEditMetricType={onEditMetricType}
                                        deleteMetricType={deleteMetricType}
                                    />
                                </CardStyled>
                            </Card>
                        </PaperFullHeight>
                    </Grid>
                    <Grid item xs={12} md={8}>
                        <PaperFullHeight>
                            <Card>
                                <CardStyled>smth</CardStyled>
                            </Card>
                        </PaperFullHeight>
                    </Grid>
                </Grid>
                {isMetricTypeFormOpen && (
                    <DataLayerDialog
                        open={isMetricTypeFormOpen}
                        closeDialog={onDialogClose}
                        metricType={selectedMetricType}
                    />
                )}
            </PageContainer>
        </>
    );
};
