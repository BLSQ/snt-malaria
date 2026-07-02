import React, { FC, useMemo, useState } from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { DeleteModal } from 'Iaso/components/DeleteRestoreModals/DeleteModal';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../../messages';
import { usePlanningContext } from '../../../contexts/PlanningContext';
import { useDeleteScenarioRule } from '../../../hooks/useDeleteScenarioRule';
import { generateRuleName } from '../../../libs/rule-utils';
import { ScenarioRule } from '../../../types/scenarioRule';

const styles: SxStyles = {
    colorBox: {
        width: 16,
        minWidth: 16,
        height: 16,
        mr: 2,
        borderRadius: '5px',
    },
    contentBox: {
        width: '100%',
    },
    deleteAction: {
        display: 'flex',
        alignItems: 'center',
        ml: 'auto',
    },
    rulesText: {
        ml: 4,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        textWrap: 'balance',
    },
};

type Props = {
    scenarioId: number;
    rule: ScenarioRule;
    onEdit: (rule: ScenarioRule) => void;
};

export const ScenarioRuleLine: FC<Props> = ({ scenarioId, rule, onEdit }) => {
    const { formatMessage } = useSafeIntl();
    const [hovered, setHovered] = useState(false);
    const { mutateAsync: deleteScenarioRule } =
        useDeleteScenarioRule(scenarioId);

    const { metricTypeCategories, interventionCategories, isScenarioEditable } =
        usePlanningContext();

    const metricTypes = useMemo(
        () => metricTypeCategories.flatMap(category => category.items),
        [metricTypeCategories],
    );
    const metricTypeNames = useMemo(
        () =>
            metricTypes.reduce(
                (acc, mt) => acc.set(mt.id, mt.name),
                new Map<number, string>(),
            ),
        [metricTypes],
    );

    const metricTypeCriterionLabel = useMemo(() => {
        if (rule.is_match_all) {
            return formatMessage(MESSAGES.matchAllOrgUnits);
        }
        if (!rule.matching_criteria || rule.matching_criteria.length === 0) {
            return formatMessage(MESSAGES.manualSelection);
        }
        return rule.matching_criteria
            .map(ip => {
                const metricName =
                    ip.metric_type && metricTypeNames.get(ip.metric_type)
                        ? metricTypeNames.get(ip.metric_type)
                        : ip.metric_type;
                return `${metricName} ${ip.operator} ${ip.value ?? ip.string_value}`;
            })
            .join(', ');
    }, [rule, metricTypeNames, formatMessage]);

    return (
        <Grid
            container
            direction="row"
            justifyContent="space-between"
            key={rule.id}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={isScenarioEditable ? () => onEdit(rule) : undefined}
            sx={{
                cursor: isScenarioEditable ? 'pointer' : 'default',
                p: 2,
            }}
        >
            <Box sx={styles.contentBox}>
                <Grid
                    container
                    direction="row"
                    alignItems="center"
                    mb={1}
                    flexWrap="nowrap"
                >
                    <Box
                        sx={{
                            ...styles.colorBox,
                            bgcolor: rule.color,
                        }}
                    />
                    <Typography
                        variant="body1"
                        fontWeight="medium"
                        flexGrow={1}
                        my={1}
                        noWrap
                    >
                        {rule.name ||
                            generateRuleName(
                                rule.interventions,
                                interventionCategories,
                            )}
                    </Typography>
                    {isScenarioEditable && hovered && (
                        <Box
                            onClick={e => e.stopPropagation()}
                            sx={styles.deleteAction}
                        >
                            <DeleteModal
                                type="icon"
                                onConfirm={() => deleteScenarioRule(rule.id)}
                                onCancel={() => setHovered(false)}
                                titleMessage={MESSAGES.deleteScenarioRule}
                                iconProps={{}}
                                backdropClick={true}
                            >
                                {formatMessage(
                                    MESSAGES.deleteScenarioRuleConfirmMessage,
                                )}
                            </DeleteModal>
                        </Box>
                    )}
                </Grid>
                <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={styles.rulesText}
                >
                    {metricTypeCriterionLabel}
                </Typography>
            </Box>
        </Grid>
    );
};
