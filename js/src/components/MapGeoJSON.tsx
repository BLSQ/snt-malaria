import React, { FC } from 'react';
import { GeoJSON, Tooltip as LeafletTooltip } from 'react-leaflet';
import { GeoJson } from 'Iaso/components/maps/types';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { mapTheme } from '../constants/map-theme';

type Props = {
    dataKey?: string;
    orgUnit: OrgUnit;
    orgUnitMapMisc: {
        label: string | number | undefined;
        color: string | undefined;
    };
    defaultColor: string;
    /** Undefined when no selection is active. */
    isSelected?: boolean;
    onOrgUnitClick: (orgUnitId: number) => void;
    RenderTooltip?: (props: { orgUnit: OrgUnit }) => React.ReactNode;
};

export const MapGeoJSON: FC<Props> = ({
    dataKey,
    orgUnit,
    orgUnitMapMisc,
    defaultColor,
    isSelected,
    onOrgUnitClick,
    RenderTooltip,
}) => (
    <GeoJSON
        key={dataKey ? `${orgUnit.id}-${dataKey}` : orgUnit.id}
        data={orgUnit.geo_json as unknown as GeoJson}
        style={{
            color: mapTheme.borderColor,
            weight: mapTheme.shapeWeight,
            fillColor: orgUnitMapMisc?.color ?? defaultColor,
            fillOpacity:
                isSelected === false
                    ? mapTheme.paleFillOpacity
                    : mapTheme.fillOpacity,
        }}
        eventHandlers={{
            click: () => onOrgUnitClick(orgUnit.id),
        }}
    >
        <LeafletTooltip pane="popupPane">
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
