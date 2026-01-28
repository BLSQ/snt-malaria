import React, { FC } from 'react';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { Box, Button } from '@mui/material';
import { IconButton, SearchInput, useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../messages';

type Props = {
    onSearchChange: (searchTerm: string) => void;
    onCreateClick?: () => void;
};

const styles: SxStyles = {
    actionBar: {
        display: 'flex',
        width: '100%',
        justifyContent: 'space-between',
        mb: 2,
    },
    searchWrapper: { mr: 2, width: '220px' },
    createLayerButton: { ml: 2 },
};

export const MetricTypeSettingsActionBar: FC<Props> = ({
    onSearchChange,
    onCreateClick,
}) => {
    const [searchTerm, setSearchTerm] = React.useState<string>('');
    const { formatMessage } = useSafeIntl();
    return (
        <Box sx={styles.actionBar}>
            <Box sx={styles.searchWrapper}>
                <SearchInput
                    uid={''}
                    label={formatMessage(MESSAGES.searchByName)}
                    keyValue={''}
                    onEnterPressed={() => onSearchChange(searchTerm)}
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
                    onClick={onCreateClick}
                >
                    {formatMessage(MESSAGES.createLayer)}
                </Button>
            </Box>
        </Box>
    );
};
