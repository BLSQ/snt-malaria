import React, { FC, useCallback, useState } from 'react';
import { Box, Link, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../domains/messages';
import { ColorDot } from './ColorDot';
import { WarningBlock } from './WarningBlock';

const styles = {
    block: {
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
    },
    chips: {
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 0.5,
    },
    chip: {
        display: 'inline-flex',
        alignItems: 'center',
        height: 22,
        px: 1,
        borderRadius: 999,
        border: 1,
        borderColor: 'divider',
        backgroundColor: 'common.white',
        typography: 'caption',
        whiteSpace: 'nowrap',
    },
    label: {
        flexGrow: 1,
        fontWeight: 'medium',
    },
    footer: {
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        columnGap: 1.5,
        rowGap: 0.5,
    },
    scenarios: {
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        columnGap: 1.5,
        rowGap: 0.5,
    },
    scenario: {
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
    },
    secondaryText: {
        color: 'text.secondary',
    },
    toggleLink: {
        flexShrink: 0,
        ml: 'auto',
        typography: 'caption',
        fontWeight: 'medium',
    },
} satisfies SxStyles;

type Props = {
    chips?: string[];
    label?: string;
    scenarios: { color: string; label: string }[];
    countLabel?: string;
    items?: string[];
};

export const WarningGroup: FC<Props> = ({
    chips = [],
    label,
    scenarios,
    countLabel,
    items = [],
}) => {
    const { formatMessage } = useSafeIntl();
    const [showItems, setShowItems] = useState(false);

    const toggleShowItems = useCallback(() => setShowItems(prev => !prev), []);

    return (
        <WarningBlock sx={styles.block}>
            {chips.length > 0 && (
                <Box sx={styles.chips}>
                    {React.Children.toArray(
                        chips.map(chip => (
                            <Box component="span" sx={styles.chip}>
                                {chip}
                            </Box>
                        )),
                    )}
                </Box>
            )}
            <Box sx={styles.footer}>
                {label && (
                    <Typography variant="body2" sx={styles.label}>
                        {label}
                    </Typography>
                )}
                <Box sx={styles.scenarios}>
                    {countLabel ? (
                        <Box sx={styles.scenario}>
                            {React.Children.toArray(
                                scenarios.map(scenario => (
                                    <ColorDot color={scenario.color} />
                                )),
                            )}
                            <Typography
                                variant="caption"
                                noWrap
                                sx={styles.secondaryText}
                            >
                                {countLabel}
                            </Typography>
                        </Box>
                    ) : (
                        React.Children.toArray(
                            scenarios.map(scenario => (
                                <Box sx={styles.scenario}>
                                    <ColorDot color={scenario.color} />
                                    <Typography
                                        variant="caption"
                                        noWrap
                                        sx={styles.secondaryText}
                                    >
                                        {scenario.label}
                                    </Typography>
                                </Box>
                            )),
                        )
                    )}
                </Box>
                {items.length > 0 && (
                    <Link
                        component="button"
                        underline="none"
                        onClick={toggleShowItems}
                        sx={styles.toggleLink}
                    >
                        {formatMessage(
                            showItems
                                ? MESSAGES.hideDistricts
                                : MESSAGES.showDistricts,
                        )}
                    </Link>
                )}
            </Box>
            {showItems && (
                <Typography variant="caption" sx={styles.secondaryText}>
                    {items.join(', ')}
                </Typography>
            )}
        </WarningBlock>
    );
};
