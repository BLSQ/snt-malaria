import React, { FC, useState } from 'react';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ContentPasteGoOutlinedIcon from '@mui/icons-material/ContentPasteGoOutlined';
import CopyAllOutlinedIcon from '@mui/icons-material/CopyAllOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {
    Box,
    Typography,
    IconButton,
    Theme,
    TextField,
    Button,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { SxStyles } from 'Iaso/types/general';
import { baseUrls } from '../../../constants/urls';

import {
    useUpdateScenario,
    useDuplicateScenario,
    useExportScenario,
} from '../../scenarios/hooks/useGetScenarios';
import { Scenario } from '../../scenarios/types';

const actionBtnStyles = (theme: Theme) => ({
    color: theme.palette.primary.main,
    fontWeight: 'bold', // medium not working?
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: theme.spacing(2),
});

const styles: SxStyles = {
    content: (theme: Theme) => ({
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing(1),
    }),
    nameContainer: {
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        '&:hover .editButton': {
            opacity: 1,
        },
    },
    editNameBtn: {
        opacity: 0,
        transition: 'opacity 0.3s',
    },
    actionBtns: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionBtn: (theme: Theme) => ({
        ...actionBtnStyles(theme),
        textTransform: 'none',
    }),
    actionBtnSaving: (theme: Theme) => ({
        ...actionBtnStyles(theme),
        color: theme.palette.text.secondary,
    }),
    icon: {
        marginRight: '0.5rem',
    },
};

type Props = {
    scenario: Scenario;
};

export const ScenarioTopBar: FC<Props> = ({ scenario }) => {
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [tempName, setTempName] = useState(scenario.name);

    const { mutateAsync: updateScenario } = useUpdateScenario();
    const { mutateAsync: duplicateScenario } = useDuplicateScenario(
        duplicatedScenario => {
            navigate(
                `/${baseUrls.planning}/scenarioId/${duplicatedScenario.id}`,
            );
        },
    );
    const { mutateAsync: exportScenario } = useExportScenario();

    const handleEditClick = () => {
        setTempName(scenario.name);
        setIsEditing(true);
    };

    const handleDuplicateClick = () => {
        duplicateScenario(scenario.id);
        navigate(`/${baseUrls.planning}/scenarioId/${scenario.id}`);
    };

    const handleExportClick = async () => {
        exportScenario(scenario.id);
    };

    const handleInputChange = event => {
        setTempName(event.target.value);
    };

    const handleInputBlur = () => {
        handleSubmit();
    };

    const handleInputKeyPress = event => {
        if (event.key === 'Enter') {
            handleSubmit();
        }
    };

    const handleSubmit = () => {
        if (tempName.trim() !== '') {
            updateScenario({ ...scenario, name: tempName });
            setIsEditing(false);
        } else {
            setIsEditing(false);
        }
    };

    if (scenario) {
        return (
            <Box sx={styles.content}>
                <Box sx={styles.nameContainer}>
                    {isEditing ? (
                        <TextField
                            value={tempName}
                            onChange={handleInputChange}
                            onBlur={handleInputBlur}
                            onKeyPress={handleInputKeyPress}
                            autoFocus
                            size="small"
                            variant="outlined"
                        />
                    ) : (
                        <>
                            <Typography variant="h6">
                                {scenario.name}
                            </Typography>
                            <IconButton
                                className="editButton"
                                sx={styles.editNameBtn}
                                onClick={handleEditClick}
                            >
                                <EditOutlinedIcon />
                            </IconButton>
                        </>
                    )}
                </Box>
                <Box sx={styles.actionBtns}>
                    <Typography variant="body2" sx={styles.actionBtnSaving}>
                        <CheckCircleOutlinedIcon sx={styles.icon} />
                        Saved
                    </Typography>
                    <Button
                        variant="text"
                        sx={styles.actionBtn}
                        onClick={handleExportClick}
                    >
                        <ContentPasteGoOutlinedIcon sx={styles.icon} />
                        Export
                    </Button>
                    <Button
                        variant="text"
                        sx={styles.actionBtn}
                        onClick={handleDuplicateClick}
                    >
                        <CopyAllOutlinedIcon sx={styles.icon} />
                        Duplicate
                    </Button>
                </Box>
            </Box>
        );
    }

    return null;
};
