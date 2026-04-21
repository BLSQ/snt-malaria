import React, { FC, useCallback, useState } from 'react';
import { Card, Stack, Typography } from '@mui/material';
import { LoadingSpinner, useRedirectToReplace, useSafeIntl } from 'bluesquare-components';
import TopBar from 'Iaso/components/nav/TopBarComponent';
import { useParamsObject } from 'Iaso/routing/hooks/useParamsObject';

import { SxStyles } from 'Iaso/types/general';
import { CardStyled } from '../../components/CardStyled';
import { OrgUnitSelect } from '../../components/OrgUnitSelect';
import {
    MainColumn,
    PageContainer,
    PaperFullHeight,
    SidebarColumn,
    SidebarLayout,
} from '../../components/styledComponents';
import { baseUrls } from '../../constants/urls';
import {
    useGetMetricCategories,
    useGetMetricValues,
} from '../planning/hooks/useGetMetrics';
import { useGetAccountSettings } from '../planning/hooks/useGetAccountSettings';
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

type DataLayersParams = {
    displayOrgUnitId?: number;
};

export const DataLayers: FC = () => {
    const { formatMessage } = useSafeIntl();
    const { displayOrgUnitId } = useParamsObject(
        baseUrls.dataLayers,
    ) as unknown as DataLayersParams;
    const redirectToReplace = useRedirectToReplace();

    const [displayedMetricType, setDisplayedMetricType] =
        useState<MetricType>();
    const { data: accountSettings } = useGetAccountSettings();
    const interventionTypeId =
        accountSettings?.intervention_org_unit_type_id;
    const { data: orgUnits } = useGetOrgUnits({
        orgUnitParentId: displayOrgUnitId,
        orgUnitTypeId: interventionTypeId,
        enabled: !!interventionTypeId,
    });

    const { data: metricCategories, isLoading: isLoadingMetricLayers } =
        useGetMetricCategories();

    const { data: displayedMetricValues } = useGetMetricValues({
        metricTypeId: displayedMetricType?.id || null,
    });

    const { mutate: deleteMetricType } = useDeleteMetricType();

    const [isMetricTypeFormOpen, setIsMetricTypeFormOpen] =
        useState<boolean>(false);

    const [selectedMetricType, setSelectedMetricType] = useState<MetricType>();

    const handleDisplayOrgUnitChange = useCallback(
        (orgUnitId?: number) => {
            redirectToReplace(baseUrls.dataLayers, {
                displayOrgUnitId: orgUnitId?.toString(),
            });
        },
        [redirectToReplace],
    );

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
                            <Card sx={styles.card}>
                                <CardStyled
                                    header={
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Typography variant="h6">
                                                {displayedMetricType?.name || ''}
                                            </Typography>
                                            <OrgUnitSelect
                                                onOrgUnitChange={handleDisplayOrgUnitChange}
                                                selectedOrgUnitId={displayOrgUnitId}
                                            />
                                        </Stack>
                                    }
                                >
                                    <DataLayerMap
                                        metricType={displayedMetricType}
                                        metricValues={displayedMetricValues}
                                        orgUnits={orgUnits || []}
                                    />
                                </CardStyled>
                            </Card>
                        </PaperFullHeight>
                    </MainColumn>
                </SidebarLayout>
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
