import React, { FC, Ref } from 'react';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SettingsInputComponentOutlinedIcon from '@mui/icons-material/SettingsInputComponentOutlined';
import { Button, Stack, Typography } from '@mui/material';
import { IconButton, useSafeIntl } from 'bluesquare-components';
import { useSidePanelContext } from '../../../../../components/sidePanel/SidePanelContext';
import { SidePanelIconToggle } from '../../../../../components/sidePanel/SidePanelIconToggle';
import { MESSAGES } from '../../../../messages';
import { usePlanningContext } from '../../../contexts/PlanningContext';

type Props = {
    onCreateRule: () => void;
    /** Forwarded to the "Create rule" button so callers can anchor overlays
     *  (e.g. an onboarding spotlight) to it. */
    createRuleRef?: Ref<HTMLButtonElement>;
    /** Whether the account has an AI API key configured - gates the AI Chat button. */
    hasAiApiKey?: boolean;
    showAIChat?: boolean;
    onToggleAIChat?: () => void;
};

export const ScenarioRulesHeader: FC<Props> = ({
    onCreateRule,
    createRuleRef,
    hasAiApiKey,
    showAIChat,
    onToggleAIChat,
}) => {
    const { formatMessage } = useSafeIntl();
    const { isScenarioEditable } = usePlanningContext();

    return (
        <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
        >
            <Stack spacing={1} direction="row" alignItems="center">
                <SidePanelIconToggle
                    icon={SettingsInputComponentOutlinedIcon}
                />
                <Typography variant="h6" gutterBottom>
                    {formatMessage(MESSAGES.interventionTitle)}
                </Typography>
            </Stack>
            <Stack spacing={1} direction="row" alignItems="center">
                {isScenarioEditable && (
                    <>
                        {hasAiApiKey && (
                            <Button
                                variant={showAIChat ? 'contained' : 'outlined'}
                                startIcon={<AutoAwesomeIcon />}
                                onClick={() => onToggleAIChat?.()}
                            >
                                {formatMessage(
                                    MESSAGES.scenarioRuleAIChatButton,
                                )}
                            </Button>
                        )}
                        <Button
                            ref={createRuleRef}
                            onClick={() => onCreateRule()}
                        >
                            {formatMessage(MESSAGES.createScenarioRule)}
                        </Button>
                    </>
                )}
            </Stack>
        </Stack>
    );
};

/** Icon-only equivalents of the header's actions, shown in the collapsed rail so they stay
 *  usable without expanding the panel. Reads the "start creating" trigger from context since
 *  it's normally owned by the (unmounted-while-collapsed) rule form. */
export const ScenarioRulesActions: FC<
    Pick<Props, 'hasAiApiKey' | 'showAIChat' | 'onToggleAIChat'>
> = ({ hasAiApiKey, showAIChat, onToggleAIChat }) => {
    const { isScenarioEditable, startEditingRule } = usePlanningContext();
    const { open } = useSidePanelContext();

    if (!isScenarioEditable) {
        return null;
    }

    return (
        <>
            {hasAiApiKey && (
                <IconButton
                    onClick={() => onToggleAIChat?.()}
                    color={showAIChat ? 'primary' : 'action'}
                    overrideIcon={AutoAwesomeIcon}
                    tooltipMessage={MESSAGES.scenarioRuleAIChatButton}
                />
            )}
            <IconButton
                onClick={() => {
                    open();
                    startEditingRule();
                }}
                color="primary"
                overrideIcon={AddIcon}
                tooltipMessage={MESSAGES.createScenarioRule}
            />
        </>
    );
};
