import React, { FC, Fragment, useCallback, useEffect, useState } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    List,
    ListSubheader,
    Typography,
} from '@mui/material';
import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { useGetMetricCategories } from '../../../planning/hooks/useGetMetrics';
import {
    MetricType,
    MetricTypeCategory,
} from '../../../planning/types/metrics';
import { MESSAGES } from '../../messages';
import { MetricTypeDialog } from './MetricTypeDialog';
import { MetricTypeLine } from './MetricTypeLine';
import { MetricTypeSettingsActionBar } from './MetricTypeSettingsActionBar';

const styles: SxStyles = {
    card: { padding: 2 },
    category: { color: 'text.primary', px: 0 },
};

export const MetricTypeSettings: FC = () => {
    const { formatMessage } = useSafeIntl();
    const { data: metricCategories, isLoading: isLoadingMetricCategories } =
        useGetMetricCategories();

    const [filteredMetricCategories, setFilteredMetricCategories] = useState<
        MetricTypeCategory[]
    >(metricCategories || []);

    const [isMetricTypeFormOpen, setIsMetricTypeFormOpen] =
        useState<boolean>(false);
    const [selectedMetricType, setSelectedMetricType] = useState<
        MetricType | undefined
    >(undefined);

    const onDialogClose = useCallback(() => {
        setIsMetricTypeFormOpen(false);
        setSelectedMetricType(undefined);
    }, [setIsMetricTypeFormOpen, setSelectedMetricType]);

    const onEditMetricType = (metricType: MetricType) => {
        setSelectedMetricType(metricType);
        setIsMetricTypeFormOpen(true);
    };

    const onDeleteMetricType = useCallback((metricType: MetricType) => {
        alert(`Delete metric type ${metricType.name} (ID: ${metricType.id})`);
        // setSelectedMetricType(metricType);
        // setIsMetricTypeFormOpen(true);
    }, []);
    const applySearch = useCallback(
        (searchTerm: string) => {
            if (!metricCategories) {
                return;
            }

            if (!searchTerm) {
                setFilteredMetricCategories(metricCategories || []);
                return;
            }

            const filtered = metricCategories
                .map(category => ({
                    ...category,
                    items: category.items.filter(item =>
                        item.name
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase()),
                    ),
                }))
                .filter(category => category.items.length > 0);
            setFilteredMetricCategories(filtered);
        },
        [metricCategories],
    );

    useEffect(
        () => setFilteredMetricCategories(metricCategories || []),
        [metricCategories],
    );

    return (
        <Card sx={styles.card}>
            <CardHeader
                title={formatMessage(MESSAGES.dataLayersTitle)}
                subheader={formatMessage(MESSAGES.dataLayersSubtitle)}
                titleTypographyProps={{ variant: 'h6', mb: 3 }}
                subheaderTypographyProps={{ variant: 'caption' }}
            />
            <CardContent sx={styles.cardContent}>
                {(isLoadingMetricCategories && (
                    <LoadingSpinner absolute={true} />
                )) || (
                    <>
                        <MetricTypeSettingsActionBar
                            onSearchChange={applySearch}
                            onCreateClick={() => setIsMetricTypeFormOpen(true)}
                        />
                        {(filteredMetricCategories.length === 0 && (
                            <Typography variant="body2" color="textSecondary">
                                {formatMessage(MESSAGES.noMetricTypesFound)}
                            </Typography>
                        )) || (
                            <List>
                                {filteredMetricCategories.map(
                                    metricCategory => (
                                        <Fragment key={metricCategory.name}>
                                            <ListSubheader sx={styles.category}>
                                                {metricCategory.name}
                                            </ListSubheader>
                                            {metricCategory.items.map(
                                                metricType => (
                                                    <MetricTypeLine
                                                        metricType={metricType}
                                                        key={metricType.id}
                                                        onEdit={
                                                            onEditMetricType
                                                        }
                                                        onDelete={
                                                            onDeleteMetricType
                                                        }
                                                    />
                                                ),
                                            )}
                                        </Fragment>
                                    ),
                                )}
                            </List>
                        )}
                    </>
                )}
            </CardContent>
            {isMetricTypeFormOpen && (
                <MetricTypeDialog
                    open={isMetricTypeFormOpen}
                    closeDialog={onDialogClose}
                    metricType={selectedMetricType}
                />
            )}
        </Card>
    );
};
