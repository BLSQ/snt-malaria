import React, { FC, useCallback, useState } from 'react';
import { Card, Grid } from '@mui/material';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import TopBar from 'Iaso/components/nav/TopBarComponent';

import { SxStyles } from 'Iaso/types/general';
import { CardStyled } from '../../components/CardStyled';
import {
    PageContainer,
    PaperFullHeight,
} from '../../components/styledComponents';
import {
    useGetMetricCategories,
    useGetMetricValues,
} from '../planning/hooks/useGetMetrics';
import { useGetOrgUnits } from '../planning/hooks/useGetOrgUnits';
import { MetricType } from '../planning/types/metrics';
import { DataLayerDialog } from './dataLayerForm/DataLayerDialog';
import { DataLayerList } from './dataLayerList/DataLayerList';
import { DataLayerListHeader } from './dataLayerList/DataLayerListHeader';
import { DataLayerMap } from './dataLayerMap/DataLayerMap';
import { useDeleteMetricType } from './hooks/useDeleteMetricType';
import { MESSAGES } from './messages';

const styles = {
    card: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
} satisfies SxStyles;

export const DataLayers: FC = () => {
    const { formatMessage } = useSafeIntl();

    const [displayedMetricType, setDisplayedMetricType] =
        useState<MetricType>();
    const { data: orgUnits } = useGetOrgUnits();

    const { data: metricCategories, isLoading: isLoadingMetricLayers } =
        useGetMetricCategories();

    const { data: displayedMetricValues } = useGetMetricValues({
        metricTypeId: displayedMetricType?.id || null,
    });

    const { mutate: deleteMetricType } = useDeleteMetricType();

    const [isMetricTypeFormOpen, setIsMetricTypeFormOpen] =
        useState<boolean>(false);

    const [selectedMetricType, setSelectedMetricType] = useState<MetricType>();

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
                            <Card sx={styles.card}>
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
                                        onSelectMetricType={
                                            setDisplayedMetricType
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
                            <Card sx={styles.card}>
                                <CardStyled
                                    header={displayedMetricType?.name || ''}
                                >
                                    <DataLayerMap
                                        metricType={displayedMetricType}
                                        metricValues={displayedMetricValues}
                                        orgUnits={orgUnits || []}
                                    />
                                </CardStyled>
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
