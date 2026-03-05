import React, { FC } from 'react';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import { Box } from '@mui/material';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { SxStyles } from 'Iaso/types/general';
import { useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../../messages';
import { ScenarioDisplay } from '../types';
import { Card } from './Card';
import { InterventionPlanMap } from './maps/InterventionPlanMap';

type Props = {
    scenarios: ScenarioDisplay[];
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
    scenarios,
    selectedInterventionId,
    interventionOptions,
    hasInterventions,
    onInterventionSelect,
}) => {
    const { formatMessage } = useSafeIntl();

    return (
        <Box sx={styles.mapCardWrapper}>
            <Card
                title={formatMessage(MESSAGES.interventionPlanTitle)}
                icon={AccountTreeOutlinedIcon}
                actions={
                    <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="flex-end"
                    >
                        <InputComponent
                            keyValue="intervention"
                            type="select"
                            labelString={formatMessage(
                                MESSAGES.interventionLabel,
                            )}
                            value={
                                hasInterventions
                                    ? selectedInterventionId
                                    : undefined
                            }
                            options={interventionOptions}
                            clearable={false}
                            onChange={onInterventionSelect}
                            disabled={!hasInterventions}
                            withMarginTop={false}
                            wrapperSx={{ width: 260 }}
                        />
                    </Box>
                }
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
            </Card>
        </Box>
    );
};
