import React, { FC } from 'react';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import { Box } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { WidgetCard } from '../../../components/WidgetCard';
import { MESSAGES } from '../../messages';
import { useComparisonDataContext } from '../ComparisonDataContext';
import { InterventionPlanMap } from './maps/InterventionPlanMap';

type Props = {
    selectedInterventionId: number;
    interventionOptions: { label: string; value: number }[];
    hasInterventions: boolean;
    onInterventionSelect: (_key: string, value: unknown) => void;
};

const styles = {
    mapCardWrapper: {
        height: '50vh',
    },
    mapBody: {
        flex: 1,
        minHeight: 0,
        position: 'relative',
        padding: 0,
        height: '100%',
    },
} satisfies SxStyles;

export const InterventionMaps: FC<Props> = ({
    selectedInterventionId,
    interventionOptions,
    hasInterventions,
    onInterventionSelect,
}) => {
    const { scenarios } = useComparisonDataContext();
    const { formatMessage } = useSafeIntl();

    return (
        <Box sx={styles.mapCardWrapper}>
            <WidgetCard
                title={formatMessage(MESSAGES.interventionPlanTitle)}
                icon={AccountTreeOutlinedIcon}
                dropdown={{
                    value: hasInterventions ? selectedInterventionId : '',
                    options: interventionOptions,
                    onChange: value =>
                        onInterventionSelect('intervention', value),
                    disabled: !hasInterventions,
                }}
                bodySx={{ flex: 1, minHeight: 0 }}
            >
                <Box sx={styles.mapBody}>
                    <Box display="flex" gap={2} height="100%">
                        {scenarios.map(scenario => (
                            <Box
                                key={`slot-${scenario.id}`}
                                flex={1}
                                minWidth={0}
                                sx={{
                                    transition:
                                        'flex 500ms ease, opacity 500ms ease',
                                }}
                            >
                                <InterventionPlanMap
                                    key={`map-${scenario.id}`}
                                    mapId={`intervention_plan_map_${scenario.id}`}
                                    scenarioId={scenario.id}
                                    selectedInterventionId={
                                        selectedInterventionId
                                    }
                                    titleDotColor={scenario.color}
                                    titleText={scenario.label}
                                    selectedColor={scenario.color}
                                />
                            </Box>
                        ))}
                    </Box>
                </Box>
            </WidgetCard>
        </Box>
    );
};
