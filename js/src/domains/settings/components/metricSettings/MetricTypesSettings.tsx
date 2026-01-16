import React, { FC, Fragment, useCallback, useEffect, useState } from 'react';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import {
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    List,
    ListItem,
    ListItemIcon,
    ListSubheader,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    IconButton,
    LoadingSpinner,
    SearchInput,
    useSafeIntl,
} from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { useGetMetricCategories } from '../../../planning/hooks/useGetMetrics';
import { MetricTypeCategory } from '../../../planning/types/metrics';
import { MESSAGES } from '../../messages';

const styles: SxStyles = {
    card: { padding: 2 },
    category: { color: 'text.primary', px: 0 },
    actionBar: {
        display: 'flex',
        width: '100%',
        justifyContent: 'space-between',
        mb: 2,
    },
    searchWrapper: { mr: 2, width: '220px' },
    createLayerButton: { ml: 2 },
    metricType: {
        borderRadius: 2,
        width: 'auto',
        '&:nth-child(odd of .MuiListItem-root)': {
            backgroundColor: 'action.hover',
        },
    },
    metricTypeIcon: { minWidth: 20, mr: 2 },
    metricTypeDetails: {
        flexGrow: 1,
        display: 'flex',
        justifyContent: 'space-between',
        marginRight: 4,
    },
};

export const MetricTypeSettings: FC = () => {
    const [searchTerm, setSearchTerm] = React.useState<string>('');
    const { formatMessage } = useSafeIntl();
    const { data: metricCategories, isLoading: isLoadingMetricCategories } =
        useGetMetricCategories();

    const [filteredMetricCategories, setFilteredMetricCategories] = useState<
        MetricTypeCategory[]
    >(metricCategories || []);

    const applySearch = useCallback(() => {
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
                    item.name.toLowerCase().includes(searchTerm.toLowerCase()),
                ),
            }))
            .filter(category => category.items.length > 0);
        setFilteredMetricCategories(filtered);
    }, [searchTerm, metricCategories]);

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
                        <Box sx={styles.actionBar}>
                            <Box sx={styles.searchWrapper}>
                                <SearchInput
                                    uid={''}
                                    label={formatMessage(MESSAGES.searchByName)}
                                    keyValue={''}
                                    onEnterPressed={applySearch}
                                    onChange={setSearchTerm}
                                    blockForbiddenChars={false}
                                    value={searchTerm}
                                    autoComplete={''}
                                />
                            </Box>
                            <Box>
                                <IconButton
                                    aria-label="more-info"
                                    overrideIcon={MoreHorizIcon}
                                    tooltipMessage={MESSAGES.more}
                                ></IconButton>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    sx={styles.createLayerButton}
                                >
                                    {formatMessage(MESSAGES.createLayer)}
                                </Button>
                            </Box>
                        </Box>
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
                                                    <ListItem
                                                        key={metricType.id}
                                                        sx={styles.metricType}
                                                        secondaryAction={
                                                            <IconButton
                                                                aria-label="more-info"
                                                                overrideIcon={
                                                                    MoreHorizIcon
                                                                }
                                                                tooltipMessage={
                                                                    MESSAGES.more
                                                                }
                                                            ></IconButton>
                                                        }
                                                    >
                                                        <ListItemIcon
                                                            sx={
                                                                styles.metricTypeIcon
                                                            }
                                                        >
                                                            <Tooltip
                                                                title={
                                                                    metricType.description ||
                                                                    ''
                                                                }
                                                            >
                                                                <InfoOutlinedIcon />
                                                            </Tooltip>
                                                        </ListItemIcon>
                                                        <Box
                                                            sx={
                                                                styles.metricTypeDetails
                                                            }
                                                        >
                                                            <Typography variant="body2">
                                                                {
                                                                    metricType.name
                                                                }
                                                            </Typography>

                                                            <Typography variant="body2">
                                                                {
                                                                    metricType.origin
                                                                }
                                                            </Typography>
                                                        </Box>
                                                    </ListItem>
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
        </Card>
    );
};
