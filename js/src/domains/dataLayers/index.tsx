import React, { FC, useCallback, useMemo, useState } from 'react';
import { Card } from '@mui/material';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import TopBar from 'Iaso/components/nav/TopBarComponent';
import { useParamsObject } from 'Iaso/routing/hooks/useParamsObject';

import { SxStyles } from 'Iaso/types/general';
import { CardStyled } from '../../components/CardStyled';
import {
    MainColumn,
    PageContainer,
    PaperFullHeight,
    SidebarColumn,
    SidebarLayout,
} from '../../components/styledComponents';
import { baseUrls } from '../../constants/urls';
import { useGetAccountSettings } from '../planning/hooks/useGetAccountSettings';
import { useGetOrgUnits } from '../planning/hooks/useGetOrgUnits';
import { DataLayerDialog } from './dataLayerForm/DataLayerDialog';
import { DataLayerList } from './dataLayerList/DataLayerList';
import { DataLayerListHeader } from './dataLayerList/DataLayerListHeader';
import { DataLayerMapWrapper } from './dataLayerMap/DataLayerMapWrapper';
import { useDeleteMetricType } from './hooks/useDeleteMetricType';
import { useGetMetricCategories } from './hooks/useGetMetrics';
import { MESSAGES } from './messages';
import { MetricType } from './types/metrics';

const styles = {
    card: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
} satisfies SxStyles;

type DataLayersParams = {
    displayOrgUnitId?: number;
};

export const DataLayers: FC = () => {
    const { formatMessage } = useSafeIntl();
    const { displayOrgUnitId } = useParamsObject(
        baseUrls.dataLayers,
    ) as unknown as DataLayersParams;

    const [displayedMetricType, setDisplayedMetricType] =
        useState<MetricType>();
    const { data: accountSettings } = useGetAccountSettings();
    const interventionTypeId = accountSettings?.intervention_org_unit_type_id;
    const { data: orgUnits } = useGetOrgUnits({
        orgUnitParentId: displayOrgUnitId,
        orgUnitTypeId: interventionTypeId,
        enabled: !!interventionTypeId,
    });

    const { data: metricCategories, isLoading: isLoadingMetricLayers } =
        useGetMetricCategories();
    const existingCategoryOptions = useMemo(
        () =>
            (metricCategories ?? []).map(category => ({
                label: category.name,
                value: category.name,
            })),
        [metricCategories],
    );

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
                sx={{ zIndex: 401 }}
            />
            <PageContainer>
                <SidebarLayout>
                    <SidebarColumn>
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
                    </SidebarColumn>
                    <MainColumn>
                        <PaperFullHeight>
                            <DataLayerMapWrapper
                                metricType={displayedMetricType}
                                orgUnits={orgUnits || []}
                            />
                        </PaperFullHeight>
                    </MainColumn>
                </SidebarLayout>
                {isMetricTypeFormOpen && (
                    <DataLayerDialog
                        open={isMetricTypeFormOpen}
                        closeDialog={onDialogClose}
                        metricType={selectedMetricType}
                        categoryOptions={existingCategoryOptions}
                    />
                )}
            </PageContainer>
        </>
    );
};
