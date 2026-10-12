import React, {
    FC,
    MouseEvent,
    useCallback,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UndoIcon from '@mui/icons-material/Undo';
import VaccinesIcon from '@mui/icons-material/Vaccines';
import {
    Box,
    Button,
    MenuItem,
    Select,
    SelectChangeEvent,
    Typography,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { HighlightChip } from '../../../../../components/HighlightChip';
import { overrideColors } from '../../../../../constants/overrideColors';
import { Grant } from '../../../../costManagement/grants/types';
import { MESSAGES } from '../../../../messages';
import {
    countInterventionOverrides,
    emptyInterventionOverride,
} from '../../../libs/override-utils';
import { RuleInterventionOverride } from '../../../types/scenarioRule';
import { OVERRIDES_ROW_TILE_SIZE, overridesGridStyles } from './overridesGrid';

const NO_GRANT = '';
const GRANT_WIDTH = 280;
const HEADER_PADDING_LEFT = 16;
const HEADER_GAP = 16;
const INTERVENTION_TILE_SIZE = 36;
const NAME_BLOCK_GAP = 12;
const GRANT_GAP = 8;
const GRANT_SELECT_OFFSET =
    HEADER_PADDING_LEFT + HEADER_GAP + OVERRIDES_ROW_TILE_SIZE + GRANT_GAP;

const ellipsis = {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
};

const styles = {
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: `${HEADER_GAP}px`,
        minHeight: 56,
        py: 1,
        pr: 1.5,
        pl: `${HEADER_PADDING_LEFT}px`,
        cursor: 'pointer',
    },
    openHeader: {
        borderBottom: 1,
        borderColor: 'divider',
    },
    nameBlock: {
        display: 'flex',
        alignItems: 'center',
        gap: `${NAME_BLOCK_GAP}px`,
        minWidth: 0,
        flexGrow: 0,
        flexShrink: 1,
    },
    interventionTile: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: `0 0 ${INTERVENTION_TILE_SIZE}px`,
        width: INTERVENTION_TILE_SIZE,
        height: INTERVENTION_TILE_SIZE,
        borderRadius: 2,
        backgroundColor: overrideColors.overriddenBackground,
        color: 'primary.main',
    },
    interventionIcon: { fontSize: 22 },
    labels: { display: 'flex', flexDirection: 'column', minWidth: 0 },
    name: { ...ellipsis, fontWeight: 'medium' },
    caption: { color: 'text.secondary' },
    grant: {
        display: 'flex',
        alignItems: 'center',
        gap: `${GRANT_GAP}px`,
        flex: `0 1000 ${GRANT_WIDTH}px`,
        minWidth: GRANT_WIDTH / 2,
        cursor: 'default',
    },
    grantSelect: {
        flex: '1 1 auto',
        minWidth: 0,
        height: 30,
        typography: 'body2',
        '& .MuiSelect-select': { pl: 1.25, ...ellipsis },
    },
    overriddenGrantSelect: {
        backgroundColor: overrideColors.overriddenBackground,
        fontWeight: 'medium',
    },
    trailing: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 2,
        ml: 'auto',
        flex: '0 0 auto',
    },
    expandIcon: {
        display: 'flex',
        color: overrideColors.mutedIcon,
        transition: 'transform 150ms',
    },
    expandedIcon: { transform: 'rotate(180deg)' },
} satisfies SxStyles;

type Props = {
    interventionName: string;
    categoryName: string;
    defaultGrantId: number | null;
    grants: Grant[];
    override: RuleInterventionOverride;
    unitCostColumnOffset: number;
    isOpen: boolean;
    onToggleOpen: () => void;
    onChange: (next: RuleInterventionOverride) => void;
};

export const InterventionOverrideSummary: FC<Props> = ({
    interventionName,
    categoryName,
    defaultGrantId,
    grants,
    override,
    unitCostColumnOffset,
    isOpen,
    onToggleOpen,
    onChange,
}) => {
    const { formatMessage } = useSafeIntl();
    const overrideCount = countInterventionOverrides(override);

    const labelsRef = useRef<HTMLDivElement>(null);
    const [nameContentWidth, setNameContentWidth] = useState(0);
    useLayoutEffect(() => {
        const labels = labelsRef.current;
        if (!labels) return;
        const textWidth = Math.max(
            ...Array.from(labels.children).map(child => child.scrollWidth),
        );
        setNameContentWidth(
            INTERVENTION_TILE_SIZE + NAME_BLOCK_GAP + textWidth,
        );
    }, [interventionName, categoryName]);
    const nameBlockSx = useMemo(
        () => ({
            flexBasis: `${Math.max(unitCostColumnOffset - GRANT_SELECT_OFFSET, nameContentWidth)}px`,
        }),
        [nameContentWidth, unitCostColumnOffset],
    );

    const stopPropagation = useCallback(
        (event: MouseEvent) => event.stopPropagation(),
        [],
    );

    const handleGrantChange = useCallback(
        (event: SelectChangeEvent<number | string>) => {
            const grantId = event.target.value;
            onChange({
                ...override,
                grant:
                    grantId === NO_GRANT || grantId === defaultGrantId
                        ? null
                        : Number(grantId),
            });
        },
        [defaultGrantId, override, onChange],
    );

    const handleRevertAll = useCallback(
        (event: MouseEvent) => {
            event.stopPropagation();
            onChange({
                ...emptyInterventionOverride(override.intervention),
                deployment_years: override.deployment_years,
            });
        },
        [override.intervention, override.deployment_years, onChange],
    );

    return (
        <Box
            sx={[styles.header, isOpen && styles.openHeader]}
            onClick={onToggleOpen}
        >
            <Box sx={[styles.nameBlock, nameBlockSx]}>
                <Box component="span" sx={styles.interventionTile}>
                    <VaccinesIcon sx={styles.interventionIcon} />
                </Box>
                <Box ref={labelsRef} sx={styles.labels}>
                    <Typography
                        variant="body1"
                        title={interventionName}
                        sx={styles.name}
                    >
                        {interventionName}
                    </Typography>
                    <Typography variant="caption" sx={styles.caption}>
                        {categoryName}
                    </Typography>
                </Box>
            </Box>
            <Box sx={styles.grant} onClick={stopPropagation}>
                <Box component="span" sx={overridesGridStyles.tile}>
                    <AccountBalanceIcon sx={overridesGridStyles.smallIcon} />
                </Box>
                <Select<number | string>
                    size="small"
                    value={override.grant ?? defaultGrantId ?? NO_GRANT}
                    onChange={handleGrantChange}
                    inputProps={{
                        'aria-label': formatMessage(MESSAGES.grant),
                    }}
                    sx={[
                        styles.grantSelect,
                        override.grant !== null && styles.overriddenGrantSelect,
                    ]}
                >
                    {defaultGrantId === null && (
                        <MenuItem value={NO_GRANT}>
                            {formatMessage(MESSAGES.grantDefault, {
                                grant: formatMessage(MESSAGES.noGrant),
                            })}
                        </MenuItem>
                    )}
                    {grants.map(grant => (
                        <MenuItem key={grant.id} value={grant.id}>
                            {grant.id === defaultGrantId
                                ? formatMessage(MESSAGES.grantDefault, {
                                      grant: grant.name,
                                  })
                                : grant.name}
                        </MenuItem>
                    ))}
                </Select>
            </Box>
            <Box sx={styles.trailing}>
                {overrideCount > 0 && (
                    <>
                        <HighlightChip
                            label={formatMessage(MESSAGES.overrideCount, {
                                count: String(overrideCount),
                            })}
                        />
                        <Button
                            size="small"
                            startIcon={
                                <UndoIcon sx={overridesGridStyles.smallIcon} />
                            }
                            onClick={handleRevertAll}
                            sx={overridesGridStyles.textAction}
                        >
                            {formatMessage(MESSAGES.revertAll)}
                        </Button>
                    </>
                )}
                <Box
                    component="span"
                    sx={[styles.expandIcon, isOpen && styles.expandedIcon]}
                >
                    <ExpandMoreIcon />
                </Box>
            </Box>
        </Box>
    );
};
