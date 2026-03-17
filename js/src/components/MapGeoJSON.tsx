import React, { FC } from 'react';
import { GeoJSON, Tooltip as LeafletTooltip } from 'react-leaflet';
import { GeoJson } from 'Iaso/components/maps/types';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { mapTheme } from '../constants/map-theme';

type Props = {
    dataKey?: string;
    orgUnit: OrgUnit;
    orgUnitMapMisc: {
        label: string | undefined;
        color: string | undefined;
    };
    color: string;
    weight: number;
    defaultColor: string;
    onOrgUnitClick: (orgUnitId: number) => void;
    RenderTooltip?: (props: { orgUnit: OrgUnit }) => React.ReactNode;
};

export const MapGeoJSON: FC<Props> = ({
    dataKey,
    orgUnit,
    orgUnitMapMisc,
    color,
    weight,
    defaultColor,
    onOrgUnitClick,
    RenderTooltip,
}) => (
    <GeoJSON
        key={dataKey ? `${orgUnit.id}-${dataKey}` : orgUnit.id}
        data={orgUnit.geo_json as unknown as GeoJson}
        style={{
            color: color,
            weight: weight,
            fillColor: orgUnitMapMisc?.color ?? defaultColor,
            fillOpacity: mapTheme.fillOpacity,
        }}
        eventHandlers={{
            click: () => onOrgUnitClick(orgUnit.id),
        }}
    >
        <LeafletTooltip pane={'popupPane'}>
            {RenderTooltip ? (
                RenderTooltip({ orgUnit })
            ) : (
                <>
                    <b>{orgUnit.short_name}</b>
                    {orgUnitMapMisc.label && (
                        <>
                            <br />
                            {orgUnitMapMisc.label}
                        </>
                    )}
                </>
            )}
        </LeafletTooltip>
    </GeoJSON>
);
