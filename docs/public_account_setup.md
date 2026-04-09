# Public account setup

This document describes how to publicly set up an SNT malaria account.

## Required information

- username: choose a username for the account admin (must be unique)
- password: choose a password for the account admin
- password_confirmation: confirm the password for the account admin
- country: select the country targeted by the account
- geo_json_file: a geojson file containing the administrative boundaries for the country
- language: `en` or `fr` (optional)

## geo_json_file format

The geojson file must:
- respect [the GeoJSON format](https://geojson.org/)
- be a `.json` or a `.geojson` file
- be a `FeatureCollection`, which contains a `Feature` array with one object per organization unit (org unit)
- be flat: objects in the `Feature` array must represent org units at the lowest level (_e.g._ health areas, health districts, etc.)
- be a level 2 file (_e.g._ `Country` is level 0, `Region` is level 1 and `District` is level 2) - lower levels are currently not supported
- have a `properties` object for each `Feature`. The required properties are:
    - `ADM0_ID`: a unique identifier for the level 0 org unit (_e.g._ `BE` for Belgium)
    - `ADM0_NAME`: the name of the level 0 org unit (_e.g._ `Belgium`)
    - `ADM1_ID`: a unique identifier for the level 1 org unit (_e.g._ `BE.3` for the Walloon Region in Belgium)
    - `ADM1_NAME`: the name of the level 1 org unit (_e.g._ `Walloon Region`)
    - `ADM1_LEVEL_NAME`: the name of the level 1 org unit type (_e.g._ `Region`)
    - `ADM2_ID`: a unique identifier for the level 2 org unit (_e.g._ `BE.3.1` for the Luxembourg Province in the Walloon Region in Belgium)
    - `ADM2_NAME`: the name of the level 2 org unit (_e.g._ `Luxembourg Province`)
    - `ADM2_LEVEL_NAME`: the name of the level 2 org unit type (_e.g._ `Province`)
    - any other properties will be ignored
    - the level 0 name is implied to be `Country`

## Example of a valid geojson file

```json
{
  "type": "FeatureCollection",
  "name": "gadm41_BEL_2",
  "crs": {
    "type": "name",
    "properties": {
      "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
    }
  },
  "features": [
    {
      "type": "Feature",
      "properties": {
        "ADM2_ID": "BEL.1.1_1",
        "ADM0_ID": "BEL",
        "ADM0_NAME": "Belgium",
        "ADM1_ID": "BEL.1_1",
        "ADM1_NAME": "Bruxelles",
        "ADM2_NAME": "Bruxelles",
        "ADM1_LEVEL_NAME": "Region",
        "ADM2_LEVEL_NAME": "Province"
      },
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [
          [
            [
              [
                4.4035,
                50.774
              ],
              ...
            ]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "ADM2_ID": "BEL.2.1_1",
        "ADM0_ID": "BEL",
        "ADM0_NAME": "Belgium",
        "ADM1_ID": "BEL.2_1",
        "ADM1_NAME": "Vlaanderen",
        "OTHER_FIELD": "This field will be ignored",
        "ADM2_NAME": "Antwerpen",
        "ADM1_LEVEL_NAME": "Region",
        "ADM2_LEVEL_NAME": "Province",
      },
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [
          [
            [
              [
                4.7708,
                51.0399
              ],
              [
                4.7647,
                51.0346
              ],
              ....
              ]
            ]
          ],
          [
            [
              [
                4.9619,
                51.4475
              ],
              [
                4.9532,
                51.4445
              ],
              ...
            ]
          ]
        ]
      }
    }
  ]
}
```
