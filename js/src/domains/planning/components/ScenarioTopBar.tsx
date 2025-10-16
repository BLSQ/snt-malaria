import React, { FC, useCallback, useState } from 'react';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ContentPasteGoOutlinedIcon from '@mui/icons-material/ContentPasteGoOutlined';
import CopyAllOutlinedIcon from '@mui/icons-material/CopyAllOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { Box, Typography, IconButton, Theme, Button } from '@mui/material';
import { blueGrey } from '@mui/material/colors';
import { useSafeIntl } from 'bluesquare-components';
import { useFormik } from 'formik';
import { useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import DeleteDialog from 'Iaso/components/dialogs/DeleteDialogComponent';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { SxStyles } from 'Iaso/types/general';
import { baseUrls } from '../../../constants/urls';

import { MESSAGES } from '../../messages';
import { useDeleteScenario } from '../../scenarios/hooks/useDeleteScenario';
import { useDuplicateScenario } from '../../scenarios/hooks/useDuplicateScenario';
import { useUpdateScenario } from '../../scenarios/hooks/useUpdateScenario';
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
    formContainer: {
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        '&:hover .editButton': {
            opacity: 1,
        },
        '& .MuiFormLabel-root': {
            backgroundColor: blueGrey[50],
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
    yearInputWrapper: {
        maxWidth: '75px',
        marginLeft: 1,
    },
    submitButton: {
        marginLeft: 1,
    },
};

const validationSchema = Yup.object().shape({
    name: Yup.string().required(),
    start_year: Yup.number().required().min(2025).max(2035),
    end_year: Yup.number().required().min(2025).max(2035),
});

type Props = {
    scenario: Scenario;
};

export const ScenarioTopBar: FC<Props> = ({ scenario }) => {
    const navigate = useNavigate();
    const { formatMessage } = useSafeIntl();
    const [isEditing, setIsEditing] = useState(false);
    const currentYear = new Date().getFullYear();

    const { mutate: updateScenario } = useUpdateScenario(scenario.id, () =>
        setIsEditing(false),
    );
    const { mutateAsync: deleteScenario } = useDeleteScenario(() => {
        navigate('/');
    });
    const { mutateAsync: duplicateScenario } = useDuplicateScenario(
        duplicatedScenario => {
            navigate(
                `/${baseUrls.planning}/scenarioId/${duplicatedScenario.id}`,
            );
        },
    );

    const {
        values,
        setFieldValue,
        // setFieldError,
        isValid,
        handleSubmit,
        // errors,
        // touched,
        setFieldTouched,
    } = useFormik({
        initialValues: {
            name: scenario.name,
            start_year: scenario.start_year ?? currentYear,
            end_year: scenario.end_year ?? currentYear,
        },
        validationSchema,
        onSubmit: () => updateScenario({ ...scenario, ...values }),
    });

    const handleDuplicateClick = () => {
        duplicateScenario(scenario.id);
    };

    const handleDeleteClick = () => {
        deleteScenario(scenario.id);
    };

    const setFieldValueAndState = useCallback(
        (field: string, value: any) => {
            setFieldTouched(field, true);
            setFieldValue(field, value);
        },
        [setFieldTouched, setFieldValue],
    );

    if (scenario) {
        return (
            <Box sx={styles.content}>
                <Box sx={styles.formContainer}>
                    {isEditing ? (
                        <>
                            <InputComponent
                                type="text"
                                keyValue="name"
                                value={values.name}
                                onChange={setFieldValueAndState}
                                withMarginTop={false}
                                label={MESSAGES.name}
                            />
                            <Box sx={styles.yearInputWrapper}>
                                <InputComponent
                                    type="number"
                                    keyValue="start_year"
                                    value={values.start_year}
                                    onChange={setFieldValueAndState}
                                    withMarginTop={false}
                                    label={MESSAGES.startYear}
                                />
                            </Box>
                            <Box sx={styles.yearInputWrapper}>
                                <InputComponent
                                    type="number"
                                    keyValue="end_year"
                                    value={values.end_year}
                                    onChange={setFieldValueAndState}
                                    withMarginTop={false}
                                    label={MESSAGES.endYear}
                                />
                            </Box>
                            <Button
                                onClick={() => handleSubmit()}
                                sx={styles.submitButton}
                                disabled={!isValid}
                            >
                                {formatMessage(MESSAGES.apply)}
                            </Button>
                            <IconButton
                                className="editButton"
                                sx={styles.editNameBtn}
                                onClick={() => setIsEditing(false)}
                            >
                                <CloseIcon />
                            </IconButton>
                        </>
                    ) : (
                        <>
                            <Typography variant="h6">
                                {scenario.name} {scenario.start_year} -{' '}
                                {scenario.end_year}
                            </Typography>
                            <IconButton
                                className="editButton"
                                sx={styles.editNameBtn}
                                onClick={() => setIsEditing(true)}
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
                    <Typography variant="body2" sx={styles.actionBtn}>
                        <ContentPasteGoOutlinedIcon sx={styles.icon} />
                        Export
                    </Typography>
                    <Button
                        variant="text"
                        sx={styles.actionBtn}
                        onClick={handleDuplicateClick}
                    >
                        <CopyAllOutlinedIcon sx={styles.icon} />
                        Duplicate
                    </Button>
                    <DeleteDialog
                        onConfirm={handleDeleteClick}
                        titleMessage={MESSAGES.modalDeleteScenarioTitle}
                        iconColor={'primary'}
                        message={MESSAGES.modalDeleteScenarioConfirm}
                    />
                </Box>
            </Box>
        );
    }

    return null;
};
