import React, { FC } from 'react';
import Box from '@mui/material/Box/Box';
import Typography from '@mui/material/Typography/Typography';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { ColorDot } from '../../../../components/ColorDot';
import { Side } from '../../../../components/hoverCard/HoverCard';
import { overrideColors } from '../../../../constants/overrideColors';
import { MESSAGES } from '../../../messages';
import { MetricKey, ScenarioDisplay } from '../../types';
import {
    useMetricConfig,
    useMetricValuesFormatter,
} from '../../utils/metricConfig';
import { OrgUnitImpactRow } from '../../utils/orgUnitImpactTable';
import { ChangePill } from './ChangePill';

const styles = {
    table: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        padding: '2px 8px 10px',
    },
    upwardsTable: {
        padding: '10px 8px 2px',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns:
            'minmax(0, 1fr) minmax(66px, auto) minmax(66px, auto) 58px',
        gap: '6px',
        alignItems: 'center',
        padding: '0 6px',
    },
    baselineOnlyGrid: {
        gridTemplateColumns: 'minmax(0, 1fr) minmax(88px, auto)',
    },
    header: {
        paddingBottom: '4px',
        color: 'text.secondary',
    },
    columnHeader: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '5px',
        minWidth: 0,
    },
    row: {
        minHeight: 24,
        borderRadius: 1,
        fontVariantNumeric: 'tabular-nums',
    },
    highlightedRow: {
        backgroundColor: overrideColors.actionHoverBackground,
    },
    ellipsis: {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    value: {
        textAlign: 'right',
        whiteSpace: 'nowrap',
        color: 'text.secondary',
    },
    leadValue: {
        color: 'text.primary',
        fontWeight: 'fontWeightMedium',
    },
    changeCell: {
        display: 'flex',
        justifyContent: 'flex-end',
    },
    noData: {
        padding: '4px 6px',
    },
} satisfies SxStyles;

type Props = {
    rows: OrgUnitImpactRow[];
    baseline: ScenarioDisplay;
    /** Undefined for the baseline's own values only. */
    scenario?: ScenarioDisplay;
    highlightedMetric?: MetricKey;
    side: Side;
};

export const ImpactDetailsTable: FC<Props> = ({
    rows,
    baseline,
    scenario,
    highlightedMetric,
    side,
}) => {
    const { formatMessage } = useSafeIntl();
    const metricConfig = useMetricConfig();
    const formatMetricValue = useMetricValuesFormatter();
    const tableStyles = [styles.table, side.up && styles.upwardsTable];
    const gridStyles = [styles.grid, !scenario && styles.baselineOnlyGrid];

    const renderColumnHeader = (display: ScenarioDisplay, label: string) => (
        <Box component="span" sx={styles.columnHeader} title={display.label}>
            <ColorDot color={display.color} />
            <Box component="span" sx={styles.ellipsis}>
                {label}
            </Box>
        </Box>
    );

    const renderValue = (
        metric: MetricKey,
        value: number | undefined,
        isLead: boolean,
    ) => (
        <Typography
            variant="body2"
            component="span"
            sx={[styles.value, isLead && styles.leadValue]}
        >
            {value === undefined ? '–' : formatMetricValue(metric, value)}
        </Typography>
    );

    const renderChange = (row: OrgUnitImpactRow) => (
        <Box component="span" sx={styles.changeCell}>
            {row.baseline !== undefined && row.scenario !== undefined && (
                <ChangePill
                    baseline={row.baseline}
                    comparison={row.scenario}
                    positiveIsGreen={metricConfig[row.metric].positiveIsGreen}
                    dense
                />
            )}
        </Box>
    );

    if (rows.length === 0) {
        return (
            <Box sx={tableStyles}>
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={styles.noData}
                >
                    {formatMessage(MESSAGES.tooltipNoData)}
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={tableStyles}>
            <Typography
                variant="caption"
                component="div"
                sx={[...gridStyles, styles.header]}
            >
                <span />
                {renderColumnHeader(
                    baseline,
                    formatMessage(MESSAGES.baselineLabel),
                )}
                {scenario && (
                    <>
                        {renderColumnHeader(
                            scenario,
                            formatMessage(MESSAGES.tooltipCurrent),
                        )}
                        <Box component="span" sx={styles.value}>
                            {formatMessage(MESSAGES.tooltipChange)}
                        </Box>
                    </>
                )}
            </Typography>
            {rows.map(row => (
                <Box
                    key={row.metric}
                    sx={[
                        ...gridStyles,
                        styles.row,
                        row.metric === highlightedMetric &&
                            styles.highlightedRow,
                    ]}
                >
                    <Typography variant="caption" color="text.secondary" noWrap>
                        {metricConfig[row.metric].label}
                    </Typography>
                    {renderValue(row.metric, row.baseline, !scenario)}
                    {scenario && (
                        <>
                            {renderValue(row.metric, row.scenario, true)}
                            {renderChange(row)}
                        </>
                    )}
                </Box>
            ))}
        </Box>
    );
};
