import React, { FC, useState } from 'react';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import {
    Box,
    Button,
    ClickAwayListener,
    Link,
    MenuItem,
    MenuList,
    Popover,
    Theme,
} from '@mui/material';
import { IconButton, useSafeIntl } from 'bluesquare-components';
import { useNavigate } from 'react-router-dom';
import TopBar from 'Iaso/components/nav/TopBarComponent';
import { SxStyles } from 'Iaso/types/general';
import {
    ContentsContainer,
    PageContainer,
} from '../../components/styledComponents';

import { exportScenarioAPIPath } from '../../constants/api-urls';
import { baseUrls } from '../../constants/urls';
import { MESSAGES } from '../messages';
import { ImportScenarioModal } from './components/ImportScenario';
import { ScenarioComponent } from './components/Scenario';
import { useCreateScenario } from './hooks/useCreateScenario';
import { useGetScenarios } from './hooks/useGetScenarios';
import { Scenario } from './types';

const styles: SxStyles = {
    buttonsBox: (theme: Theme) => ({
        display: 'flex',
        justifyContent: 'end',
        alignItems: 'right',
        width: '100%',
        marginBottom: theme.spacing(4),
        gap: 2,
    }),
    button: {
        color: 'white',
        fontSize: '0.875rem',
        fontWeight: 'bold',
        textTransform: 'none',
    },
    moreButton: {
        paddingLeft: 1,
        paddingRight: 1,
    },
};

export const Scenarios: FC = () => {
    const { formatMessage } = useSafeIntl();
    const navigate = useNavigate();
    const { data: scenarios, isLoading } = useGetScenarios();
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const anchorRef = React.useRef<HTMLDivElement>(null);

    const { mutateAsync: createScenario, isLoading: isLoadingCreateScenario } =
        useCreateScenario();

    const handleCreateScenario = async () => {
        const scenario = (await createScenario(null)) as Scenario;
        navigate(`/${baseUrls.planning}/scenarioId/${scenario.id}`);
    };

    const togglePopover = () => {
        setIsOpen(!isOpen);
    };

    const handleClose = (event: Event) => {
        if (
            anchorRef.current &&
            anchorRef.current.contains(event.target as HTMLElement)
        ) {
            return;
        }

        setIsOpen(false);
    };

    return (
        <>
            <TopBar title={formatMessage(MESSAGES.title)} disableShadow />
            <PageContainer>
                <ContentsContainer>
                    <Box sx={styles.buttonsBox}>
                        <Button
                            sx={styles.button}
                            variant="contained"
                            color="primary"
                            size="small"
                            onClick={handleCreateScenario}
                            disabled={isLoadingCreateScenario}
                        >
                            {formatMessage(MESSAGES.createScenario)}
                        </Button>
                        <Box ref={anchorRef}>
                            <IconButton
                                overrideIcon={MoreHorizIcon}
                                onClick={togglePopover}
                                tooltipMessage={MESSAGES.more}
                            ></IconButton>
                        </Box>
                        <Popover
                            id="import_scenario"
                            open={isOpen}
                            anchorEl={anchorRef.current}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'right',
                            }}
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                        >
                            <ClickAwayListener onClickAway={handleClose}>
                                <MenuList>
                                    <ImportScenarioModal
                                        iconProps={{}}
                                        onClose={() => setIsOpen(false)}
                                    />
                                    <MenuItem
                                        component={Link}
                                        href={exportScenarioAPIPath}
                                    >
                                        {formatMessage(
                                            MESSAGES.downloadCSVTemplate,
                                        )}
                                    </MenuItem>
                                </MenuList>
                            </ClickAwayListener>
                        </Popover>
                    </Box>

                    {isLoading && <p>{formatMessage(MESSAGES.loading)}</p>}
                    {!isLoading &&
                        scenarios &&
                        scenarios.map((scenario: Scenario) => (
                            <ScenarioComponent
                                key={scenario.id}
                                scenario={scenario}
                            />
                        ))}
                </ContentsContainer>
            </PageContainer>
        </>
    );
};
