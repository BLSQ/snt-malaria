# Impact Provider Setup

The impact module connects IASO scenarios to external epidemiological impact
data sources to compute cases, prevalence, averted cases, and cost-effectiveness
metrics. The provider architecture is extensible — new providers can be added
for any data source, whether it's a database, REST API, or other integration.

## Overview

Three things must be configured per account:

1. **ImpactProviderConfig** — which provider to use, connection details, and
   provider-specific settings
2. **Intervention.impact_ref** — how IASO interventions map to the provider's
   intervention schema
3. **ImpactOrgUnitMapping** (optional) — custom mapping from IASO org units to
   the external source's geographic identifiers (falls back to `org_unit.name`)

## 1. ImpactProviderConfig (Django Admin)

Navigate to **Django Admin → SNT Malaria → Impact provider configurations** and
create a new entry for the account.

### Fields

| Field               | Description |
|---------------------|-------------|
| `account`           | The IASO account (one config per account) |
| `provider_key`      | The provider identifier (e.g. `swisstph`, `idm`, `fake`) |
| `config`            | JSON with provider-specific settings. The structure varies per provider — see the provider-specific tables below for required and optional keys. |
| `secret`            | A sensitive credential (password, API key, token, etc.). Always a single string, encrypted at rest using Fernet. Requires `ENCRYPTED_TEXT_FIELD_KEY` to be set in the environment. |
| `cache_ttl_seconds` | How long impact API responses are cached, in seconds. Defaults to `604800` (7 days). Set to `0` to disable caching. |

Example JSON for the `config` field:

```json
{
  "db_name": "",
  "db_host": "",
  "db_port": 5432,
  "db_username": "",
  "admin_field": "admin_2",
  "eir_ci_mean": "middle",
  "eir_ci_lower": "low",
  "eir_ci_upper": "high"
}
```

> [!NOTE]
> If the config is incomplete, the registry will gracefully return "no provider configured" instead of erroring, and log a warning.

### SwissTPH Configuration

**Config:**

| Key            | Required | Default      | Description                        |
|----------------|----------|--------------|------------------------------------|
| `db_name`      | yes      |              | Database name                      |
| `db_host`      | yes      |              | Database host                      |
| `db_port`      | no       | `5432`       | Database port                      |
| `db_username`  | yes      |              | Database user                      |
| `admin_field`  | no       | `"admin_1"`  | Column used for org unit matching  |
| `eir_ci_mean`  | no       | `"EIR_mean"` | EIR_CI value for the mean band     |
| `eir_ci_lower` | no       | `"EIR_lci"`  | EIR_CI value for the lower bound   |
| `eir_ci_upper` | no       | `"EIR_uci"`  | EIR_CI value for the upper bound   |

**Secret:** the database password.

> [!NOTE]
> Cameroon uses `admin_field: "admin_2"` and EIR_CI values `"middle"`, `"low"`, `"high"`.

### IDM Configuration

**Config:**

| Key            | Required | Default | Description   |
|----------------|----------|---------|---------------|
| `db_name`      | yes      |         | Database name |
| `db_host`      | yes      |         | Database host |
| `db_port`      | no       | `5432`  | Database port |
| `db_username`  | yes      |         | Database user |

**Secret:** the database password.

### Fake Configuration

The fake provider is a demo-only provider that synthesises epidemiologically
plausible metrics on the fly, with no external data source. It uses the
population values from an existing data-layer `MetricType` on the account as
its only real input, which makes it cheap to enable on any account that
already has population data loaded.

**Config:**

| Key                      | Required | Default | Description                                                             |
|--------------------------|----------|---------|-------------------------------------------------------------------------|
| `population_metric_code` | yes      |         | `code` of the `MetricType` (data layer) holding total population values |

**Secret:** not used (leave empty).

**Caching:** not required. The fake provider is fast enough to compute on every
request, so you can set `cache_ttl_seconds` to `0` to disable caching.

Example:

```json
{
  "population_metric_code": "POPULATION"
}
```

> [!NOTE]
> Responses are tagged with `provider_meta.provider_key = "fake"`. The Compare & Customize UI picks this up and shows an info banner so users know the figures are generated, not real.

## 2. Intervention impact_ref

Each `Intervention` has an `impact_ref` field that tells the provider how to
match it in the external data source. The format is provider-specific. Configure
this in **Django Admin → SNT Malaria → Interventions** (the field is
list-editable).

### SwissTPH format

Use the `deployed_int_`* column name from the `impact_data` table. Multiple
columns can be comma-separated when one intervention maps to multiple columns
(e.g. `deployed_int_pbo,deployed_int_itn`).


| Intervention                                      | impact_ref                           |
|---------------------------------------------------|--------------------------------------|
| CM                                                | `deployed_int_cm`                    |
| CM Subsidy                                        | n/a, use `deployed_int_cm` for now   |
| iCCM                                              | `deployed_int_iccm`                  |
| IPTp (SP)                                         | `deployed_int_iptsc`                 |
| IRS                                               | `deployed_int_irs`                   |
| Standard Pyrethroid (Campaign / Routine / School) | `deployed_int_itn`                   |
| PBO (Campaign / Routine / School)                 | `deployed_int_pbo`                   |
| Dual AI (Campaign / Routine / School)             | `deployed_int_ig2`                   |
| LSM                                               | `deployed_int_lsm`                   |
| PMC (SP)                                          | `deployed_int_pmc`                   |
| SMC (SP+AQ)                                       | `deployed_int_smc`                   |
| R21 / RTS,S                                       | `deployed_int_vaccine`               |


### IDM format

Use `type:option` from the `intervention_package` table. The provider resolves
these against the `intervention_package` table to get the package ID used for
filtering `model_output`.


| Intervention                                   | impact_ref              |
| ---------------------------------------------- | ----------------------- |
| CM                                             | `cm:cm`                 |
| CM Subsidy                                     | `cm_subsidy:cm_subsidy` |
| iCCM                                           | n/a                     |
| IPTp (SP)                                      | `iptp:iptp`             |
| IRS                                            | `irs:irs`               |
| Standard Pyrethroid / PBO / Dual AI (Campaign) | `itn_c:itn_c`           |
| Standard Pyrethroid / PBO / Dual AI (Routine)  | `itn_r:itn_r`           |
| LSM                                            | `lsm:lsm`               |
| PMC (SP)                                       | `smc:pmc`               |
| SMC (SP+AQ)                                    | `smc:smc`               |
| R21 / RTS,S                                    | `vacc:vacc`             |


### Fake format

Map each real intervention to one of five generic strength tiers, from
`impact_1` (weakest) to `impact_5` (strongest). Tier choice drives both the
initial reduction and the multi-year trajectory — weaker tiers let cases
drift upwards over time, stronger tiers show a sustained decline.

| impact_ref | Rough effect size                           |
|------------|---------------------------------------------|
| `impact_1` | ~5% reduction, slight yearly increase       |
| `impact_2` | ~12% reduction, mild yearly decline         |
| `impact_3` | ~20% reduction, moderate yearly decline     |
| `impact_4` | ~28% reduction, strong yearly decline       |
| `impact_5` | ~38% reduction, sustained strong decline    |

Pick a tier that roughly matches how impactful the real intervention is
expected to be — the absolute numbers are illustrative, not calibrated.

### Other providers

New providers define their own `impact_ref` format. The provider's
`_map_intervention()` method is responsible for parsing the `impact_ref` string
and translating it into whatever the external source requires.

## 3. ImpactOrgUnitMapping (optional)

By default, providers match org units using `org_unit.name`. When the name in
IASO doesn't match the identifier in the external data source, create an
`ImpactOrgUnitMapping` to provide a custom `reference` string. Org units that
cannot be found in the external data source will raise an `OrgUnitMappingError`.

> [!NOTE]
> Not applicable to the fake provider, which reads population directly from a Iaso data layer and so matches org units by their internal ID.

### Existing mapping files

Mapping files for current deployments:

- **Cameroon**: [cameroon_impact_mapping.json](../management/commands/fixtures/cameroon_impact_mapping.json)
- **Nigeria**: [nigeria_impact_mapping.json](../management/commands/fixtures/nigeria_impact_mapping.json)

### Loading mappings

Use the management command:

```bash
python manage.py load_impact_org_unit_mappings \
  --account "Account Name" \
  --mapping-file plugins/snt_malaria/management/commands/fixtures/cameroon_impact_mapping.json
```

Options:

- `--account` or `--account-id`: identifies the IASO account
- `--mapping-file`: path to a JSON file with the mapping tree
- `--overwrite`: update existing mappings (without this flag, existing mappings
  are skipped)

### Mapping file format

A hierarchical JSON array where each node has `name` (matching the IASO org unit
name), an optional `reference` (the identifier in the external source), and
optional `children`:

```json
[
  {
    "name": "Region Name",
    "reference": "region_name_in_external_source",
    "children": [
      { "name": "District A", "reference": "district_a_in_external_source" },
      { "name": "District B", "reference": "district_b_in_external_source" }
    ]
  }
]
```

If `reference` is omitted, it defaults to the node's `name`. The hierarchy is
used to disambiguate org units with the same name by matching the ancestor path.

### Manual editing via Django Admin

Navigate to **Django Admin → SNT Malaria → Impact org unit mappings**. The
`reference` field is list-editable for quick bulk updates.

## Verification

After setup, the impact API endpoints should return data:

- `GET /api/snt_malaria/impact/year_range/` — returns `{min_year, max_year}`
- `GET /api/snt_malaria/impact/age_groups/` — returns available age groups
- `GET /api/snt_malaria/impact/?scenario=<id>&age_group=<group>` — returns
  impact metrics if the intervention mix of the scenario is found in the
  impact data

If the provider is not configured or config is incomplete, these endpoints
return a 404 with "No impact data provider configured for this account."

Org units not found in the external data source will raise an
`OrgUnitMappingError` — check the `ImpactOrgUnitMapping` references and verify
they exist in the provider's data.

## Architecture

![Impact module architecture](./impact_architecture.png)