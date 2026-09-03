import React, { FC, ReactNode, useMemo } from 'react';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import LayersIcon from '@mui/icons-material/Layers';
import {
    FormControl,
    InputLabel,
    ListItemIcon,
    ListItemText,
    MenuItem,
    Select,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { OpenHexaSvg } from 'Iaso/components/svg/OpenHexaSvg';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../messages';

export const LAYER_TYPES = {
    DATA: 'data',
    COMPOSITE: 'composite',
    OPENHEXA: 'openhexa',
};

type Option = {
    value: string;
    label: string;
    icon: ReactNode;
};

type Props = {
    value: string;
    onChange: (value: string) => void;
    /** Whether the composite option is offered. */
    showComposite?: boolean;
    /** Whether the OpenHexa data layer option is offered (account has OpenHexa configured). */
    showOpenHexa?: boolean;
    disabled?: boolean;
};

const styles = {
    // Keeps the same height (40px) as the InputComponent fields around it.
    control: {
        '& .MuiSelect-select': {
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            paddingTop: '8.5px !important',
            paddingBottom: '8.5px !important',
        },
    },
    icon: {
        minWidth: 32,
    },
} satisfies SxStyles;

/** Outlined select whose options carry a leading icon - the shared InputComponent select can't. */
export const LayerTypeSelect: FC<Props> = ({
    value,
    onChange,
    showComposite = false,
    showOpenHexa = false,
    disabled = false,
}) => {
    const { formatMessage } = useSafeIntl();
    const label = formatMessage(MESSAGES.layerType);

    const options: Option[] = useMemo(() => {
        const layerTypes = [
            {
                value: LAYER_TYPES.DATA,
                label: formatMessage(MESSAGES.layerTypeData),
                icon: <LayersIcon fontSize="small" />,
            },
        ];
        if (showOpenHexa) {
            layerTypes.push({
                value: LAYER_TYPES.OPENHEXA,
                label: formatMessage(MESSAGES.layerTypeOpenHexa),
                icon: <OpenHexaSvg fontSize="small" disabled={false} />,
            });
        }
        if (showComposite) {
            layerTypes.push({
                value: LAYER_TYPES.COMPOSITE,
                label: formatMessage(MESSAGES.compositeLayer),
                icon: <AccountTreeIcon fontSize="small" />,
            });
        }
        return layerTypes;
    }, [formatMessage, showComposite, showOpenHexa]);

    return (
        <FormControl
            fullWidth
            size="small"
            disabled={disabled}
            sx={styles.control}
        >
            <InputLabel id="layer-type-label">{label}</InputLabel>
            <Select
                labelId="layer-type-label"
                label={label}
                value={value}
                onChange={event => onChange(event.target.value as string)}
                renderValue={selected => {
                    const option = options.find(o => o.value === selected);
                    return (
                        <>
                            {option?.icon}
                            {option?.label}
                        </>
                    );
                }}
            >
                {options.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                        <ListItemIcon sx={styles.icon}>
                            {option.icon}
                        </ListItemIcon>
                        <ListItemText>{option.label}</ListItemText>
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
};
