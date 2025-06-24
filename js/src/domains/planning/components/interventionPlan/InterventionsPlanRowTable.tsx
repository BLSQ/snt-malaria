import React, { FunctionComponent } from 'react';
import { TableCell, TableRow } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { InterventionPlan } from '../../types/interventions';
import { InterventionsMixCell } from './InterventionsMixCell';
import { OrgUnitsMixCell } from './OrgUnitsMixCell';

type Props = {
    scenarioId: number | undefined;
    row: InterventionPlan;
    index: number;
    iconProps: any;
    setSelectedInterventions: React.Dispatch<
        React.SetStateAction<Record<number, number[]>>
    >;
    selectedInterventions: () => void;
    setMixName: (name: string) => void;
    mixName: string;
    onRemoveOrgUnit: (orgUnitId: number, planId: number) => void;
};

const styles: SxStyles = {
    tableCellStyle: {
        padding: theme => theme.spacing(0),
    },
};
export const InterventionsPlanRowTable: FunctionComponent<Props> = ({
    scenarioId,
    row,
    index,
    iconProps,
    setSelectedInterventions,
    selectedInterventions,
    setMixName,
    mixName,
    onRemoveOrgUnit,
}) => {
    return (
        <TableRow key={index}>
            <TableCell
                sx={{
                    ...styles.tableCellStyle,
                    minWidth: '200px',
                    paddingTop: 1,
                    paddingBottom: 1,
                    paddingLeft: 1,
                    verticalAlign: 'top',
                }}
            >
                <InterventionsMixCell
                    row={row}
                    scenarioId={scenarioId}
                    iconProps={iconProps}
                    setSelectedInterventions={setSelectedInterventions}
                    selectedInterventions={selectedInterventions}
                    setMixName={setMixName}
                    mixName={mixName}
                />
            </TableCell>
            <TableCell
                sx={{
                    ...styles.tableCellStyle,
                    paddingTop: 1,
                    paddingRight: 1,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    verticalAlign: 'top',
                }}
            >
                <OrgUnitsMixCell row={row} onRemoveOrgUnit={onRemoveOrgUnit} />
            </TableCell>
        </TableRow>
    );
};
