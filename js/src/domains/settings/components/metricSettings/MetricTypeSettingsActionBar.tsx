import React, { FC } from 'react';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { Box, Button, Link, MenuItem, Popover } from '@mui/material';
import { IconButton, SearchInput, useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { exportMetricValuesTemplateAPIPath } from '../../../../constants/api-urls';
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
    const anchorRef = React.useRef<HTMLButtonElement>(null);
    const [isExtraActionOpen, setIsExtraActionOpen] = React.useState(false);

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
            <Box ref={anchorRef}>
                <IconButton
                    aria-label="more-info"
                    overrideIcon={MoreHorizIcon}
                    tooltipMessage={MESSAGES.more}
                    onClick={() => setIsExtraActionOpen(true)}
                ></IconButton>
                <Popover
                    id="more-info-popover"
                    open={isExtraActionOpen}
                    anchorEl={anchorRef.current}
                    onClose={() => setIsExtraActionOpen(false)}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'left',
                    }}
                >
                    <MenuItem
                        component={Link}
                        href={exportMetricValuesTemplateAPIPath}
                    >
                        {formatMessage(MESSAGES.importCSV)}
                    </MenuItem>
                    <MenuItem
                        component={Link}
                        href={exportMetricValuesTemplateAPIPath}
                    >
                        {formatMessage(MESSAGES.downloadCSVTemplate)}
                    </MenuItem>
                </Popover>
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
