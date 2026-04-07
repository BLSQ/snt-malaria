# Budgeting / Budget Calculation (SNT Malaria)

This document describes **how budgets are calculated** in this codebase, including:

- **Data inputs** (population metrics, unit costs, scenario assignments)
- **Assumptions / parameters** (defaults, overrides, special cases)
- **Formulas per intervention code** (ITN Campaign, ITN Routine, IPTp, SMC, PMC, Vaccine)
- **Multi-year behavior** (what is truly year-specific vs duplicated)
- **Fallbacks & error handling** (e.g., missing population / children population)

---

## High-level flow (backend)

Budget calculation is triggered by a **POST** to `POST /api/snt_malaria/budgets/` with `{ "scenario": <id> }`.

Core entry point:

- `plugins/snt_malaria/api/budget/views.py` → `BudgetViewSet.create()`

The pipeline is:

1. **Validate scenario**
   - `plugins/snt_malaria/api/budget/serializers.py` (`BudgetCreateSerializer.validate_scenario`)
   - Ensures:
     - `scenario.start_year` and `scenario.end_year` exist
     - Scenario has at least one `InterventionAssignment`
     - Permissions: scenario owner OR full-write permission

2. **Build inputs**
   - **Cost dataframe**: `build_cost_dataframe(account, start_year, end_year)`
   - **Population dataframe**: `build_population_dataframe(account, start_year, end_year)`
   - **Interventions input** (where interventions are applied): `build_interventions_input(scenario)`
   - **Assumptions settings**: `build_budget_assumptions(scenario)`

3. **Call budgeting engine**
   - `snt_malaria_budgeting.BudgetCalculator(...)`
   - For each year in `[start_year, end_year]`:
     - `get_interventions_costs(year)`
     - `get_places_costs(year)`

4. **Post-process & persist**
   - Rename `cost_class` → `category` for UI convenience
   - Rename place key `place` → `org_unit_id`
   - Attach `intervention.id` into org-unit breakdown (best-effort mapping by `(code, type)`)
   - Save a `Budget` row with:
     - `cost_input` (stored copy of the cost dataframe)
     - `population_input` (stored copy of the population dataframe)
     - `assumptions` (final dict sent to the engine)
     - `results` (list of per-year outputs)

---

## Data inputs

### Scenario interventions (where budget is applied)

Source:

- `plugins/snt_malaria/models/intervention.py` → `InterventionAssignment`

The backend converts assignments into a list of Pydantic models:

- `plugins/snt_malaria/api/budget/utils.py` → `build_interventions_input(scenario)`
- Output item shape (from budgeting lib):
  - `InterventionDetailModel(type: str, code: str, places: List[Union[str,int]])`

Important details:

- Assignments are grouped by **(intervention.code, intervention.short_name)**.
- “Places” are `org_unit.id` (integers).

This becomes `scen_data` inside the budgeting library, with columns like:

- `code_smc` (=1 for included org units), `type_smc` (string label)
- similarly for `itn_campaign`, `itn_routine`, `iptp`, `pmc`, `vacc`

### Unit costs (cost breakdown lines)

Source:

- `plugins/snt_malaria/models/cost_breakdown.py` → `InterventionCostBreakdownLine`

Key fields:

- `intervention` (FK) → provides:
  - `code_intervention` = `Intervention.code`
  - `type_intervention` = `Intervention.short_name`
- `category` (choice) → becomes budgeting “**cost_class**”
- `unit_type` (choice) → becomes budgeting “**unit**”
- `unit_cost` → used as `usd_cost` (float conversion)

Budget cost classes in our DB (Django choices):

- Procurement, Distribution, Operational, Supportive, Other

Budget “unit” values in our DB map (via Django display strings) to the budgeting engine’s expected labels, e.g.:

- `PER_ITN` → `"per ITN"`
- `PER_BALE` → `"per bale"`
- `PER_SP` → `"per SP"`
- `PER_DOSE` → `"per dose"`
- `PER_CHILD` → `"per child"`
- `PER_SPAQ_3_11_MONTHS` → `"per SPAQ pack 3-11 month olds"`
- `PER_SPAQ_12_59_MONTHS` → `"per SPAQ pack 12-59 month olds"`

### Population metrics

Source:

- `iaso.models.MetricType` + `iaso.models.MetricValue`

Backend transforms metric values into a dataframe with one row per `(org_unit_id, year)` and columns used by the budgeting engine.

In `build_population_dataframe()`:

- It requires `MetricType` entries for the account, and **must have** `MetricType.code == "POPULATION"`.
- It reads `MetricValue` rows for these metric types and pivots them into columns:

| MetricType.code | Budgeting column |
|---|---|
| `POPULATION` | `pop_total` |
| `POP_UNDER_5` | `pop_0_5` |
| `POP_0_1_Y` | `pop_0_1` |
| `POP_1_2_Y` | `pop_1_2` |
| `POP_5_36_M` | `pop_vaccine_5_36_months` |
| `POP_PREGNANT_WOMAN` | `pop_pw` |
| `POP_5_10_Y` | `pop_5_10` |
| `POP_URBAN` | `pop_urbain` |

---

## Assumptions & overrides (parameters)

### Default assumptions (from budgeting library)

Defaults are imported from `snt_malaria_budgeting.DEFAULT_COST_ASSUMPTIONS`:

- `itn_campaign_divisor` (people per net)
- `itn_campaign_bale_size`
- `itn_campaign_buffer_mult`
- `itn_campaign_coverage`
- `itn_routine_coverage`
- `itn_routine_buffer_mult`
- `iptp_anc_coverage`
- `iptp_doses_per_pw`
- `iptp_buffer_mult`
- `smc_pop_prop_3_11`, `smc_pop_prop_12_59`, `smc_monthly_rounds`, `smc_buffer_mult`, `smc_coverage`
- `pmc_coverage`, `pmc_touchpoints`, `pmc_tablet_factor`, `pmc_buffer_mult`
- `vacc_coverage`, `vacc_doses_per_child`, `vacc_buffer_mult`
- plus default “type” strings like `smc_type`, `vacc_type`, etc.

### Overrides stored in our DB

Current (legacy) override mechanism:

- `plugins/snt_malaria/models/budget_assumptions.py` → `BudgetAssumptions`
- Applied by:
  - `plugins/snt_malaria/api/budget/utils.py` → `build_budget_assumptions(scenario)`

Rules:

- Start with a copy of `DEFAULT_COST_ASSUMPTIONS`.
- For each stored `BudgetAssumptions` row, override matching keys.
- Special case:
  - `intervention_code == "iptp"` and `field == "coverage"` maps to `iptp_anc_coverage`
  - Implemented by `get_assumption_key()`

Also, when listing assumptions defaults for the UI:

- `plugins/snt_malaria/api/budget_assumptions/views.py` falls back to:
  - `DEFAULT_COST_ASSUMPTIONS.get(f"{prefix}_{key}", 0)`
  - with the same IPTp `coverage` → `iptp_anc_coverage` prefix rule

---

## The budgeting engine: what it does

The backend delegates the math to the external library `snt_malaria_budgeting` (PATH budgeting function port):

- `snt_malaria_budgeting.core.PATH_generate_budget.generate_budget()`

Conceptually:

1. **Quantify “quantity”** needed per intervention per org unit per year using population + assumptions.
2. **Join** those quantities with `cost_data` using:
   - `(code_intervention, type_intervention, unit, year)`
3. Compute:
   - `cost_element = quantity * unit_cost`
4. Output a long-form table including:
   - `target_pop` (the “served/eligible” population measure per intervention)
   - `cost_class` (Procurement/Operational/…)
   - `currency` (local + USD)

Then `BudgetCalculator.get_interventions_costs()` aggregates it into:

- per `(type_intervention, code_intervention)`:
  - `total_cost` = sum of `cost_element`
  - `total_pop` = sum of `target_pop` **with duplicates dropped per org unit**
  - `cost_breakdown` = sum of `cost_element` grouped by `cost_class`

And `BudgetCalculator.get_places_costs()` aggregates into:

- per org unit:
  - `total_cost`
  - interventions list with per-cost-class breakdown

---

## Formulas per intervention code

All formulas below are taken directly from `snt_malaria_budgeting/core/PATH_generate_budget.py`.

Notation:

- \(P_x\) refers to the population column \(x\) for an org unit+year row.
- \(coverage\), \(buffer\_mult\), etc. are from the assumptions dict.
- “Quantity” is what gets multiplied by a unit cost.
- “Target pop” is what the UI displays as `total_pop` (after aggregation).

### ITN — Campaign (`code_intervention = itn_campaign`)

Population used (default):

- `pop_total` (can be changed via assumption `"ITN Campaign: target population"`)

Definitions:

- \(target\_pop\_raw = \sum itn\_campaign\_pop\_col\) (default = `pop_total`)
- \(target\_pop = target\_pop\_raw \times itn\_campaign\_coverage\)
- \(quant\_nets = (target\_pop / itn\_campaign\_divisor) \times itn\_campaign\_buffer\_mult\)
- \(quant\_bales = quant\_nets / itn\_campaign\_bale\_size\)

Units emitted:

- `"per ITN"` with `quantity = quant_nets`
- `"per bale"` with `quantity = quant_bales`

### ITN — Routine (`code_intervention = itn_routine`)

Population used (default):

- `pop_0_5 + pop_pw` (can be changed via assumption `"ITN Routine: target population"`)

Definitions:

- \(target\_pop = \sum itn\_routine\_pop\_col\)
- \(quantity = (target\_pop \times itn\_routine\_coverage) \times itn\_routine\_buffer\_mult\)

Unit emitted:

- `"per ITN"` with that `quantity`

### IPTp (`code_intervention = iptp`)

Population used:

- `pop_pw` (pregnant women)

Definitions:

- \(target\_pop = pop\_pw\)
- \(quantity = (pop\_pw \times iptp\_anc\_coverage \times iptp\_doses\_per\_pw) \times iptp\_buffer\_mult\)

Unit emitted:

- `"per SP"` with that `quantity`

### SMC (`code_intervention = smc`)

Population used (default):

- `pop_0_5` (can be changed via assumption `"SMC: target population"`)

Definitions:

- **3–11 months SPAQ packs**:
  - \(quant\_{3-11} = (pop\_0\_5 \times smc\_pop\_prop\_{3\_11} \times smc\_coverage) \times smc\_monthly\_rounds \times smc\_buffer\_mult\)
- **12–59 months SPAQ packs**:
  - \(quant\_{12-59} = (pop\_0\_5 \times smc\_pop\_prop\_{12\_59} \times smc\_coverage) \times smc\_monthly\_rounds \times smc\_buffer\_mult\)
- **Target population** (displayed in `total_pop`):
  - \(target\_pop = pop\_0\_5 \times (smc\_pop\_prop\_{3\_11} + smc\_pop\_prop\_{12\_59}) \times smc\_coverage\)

Units emitted:

- `"per SPAQ pack 3-11 month olds"` with `quantity = quant_{3-11}`
- `"per SPAQ pack 12-59 month olds"` with `quantity = quant_{12-59}`

### PMC (`code_intervention = pmc`)

Population used:

- `pop_0_1` and `pop_1_2`

Definitions (per the reference implementation):

- \(sp\_{0-1} = pop\_0\_1 \times pmc\_coverage \times pmc\_touchpoints \times 1 \times pmc\_tablet\_factor \times pmc\_buffer\_mult\)
- \(sp\_{1-2} = pop\_1\_2 \times pmc\_coverage \times pmc\_touchpoints \times 2 \times pmc\_tablet\_factor \times pmc\_buffer\_mult\)
- \(quantity = sp\_{0-1} + sp\_{1-2}\)
- \(target\_pop = (pop\_0\_1 \times pmc\_coverage) + (pop\_1\_2 \times pmc\_coverage)\)

Unit emitted:

- `"per SP"` with that `quantity`

### Vaccine (`code_intervention = vacc`)

Population used:

- `pop_vaccine_5_36_months`

Definitions:

- \(quant\_child = pop\_vaccine\_5\_36\_months \times vacc\_coverage\)
- \(quant\_doses = quant\_child \times vacc\_doses\_per\_child \times vacc\_buffer\_mult\)
- \(target\_pop = quant\_child\)

Units emitted:

- `"per child"` with `quantity = quant_child`
- `"per dose"` with `quantity = quant_doses`

---

## Multi-year handling (important constraints)

Budgets are stored as an array of years:

- `Budget.results = [{ year, interventions, org_units_costs }, ...]`

### What is year-specific in the current implementation?

- The backend loops over years and calls the budgeting library separately per year.
- The budgeting library expects:
  - `population_df` contains rows for the requested year
  - `cost_df` contains rows where `cost_year_for_analysis == year`

### Current backend behavior: year duplication

Both population and costs are **duplicated across the scenario year range**.

1) Population duplication:

- `build_population_dataframe(account, start_year, end_year)` pivots population by **org_unit only** and then copies the same row into every year.
- This means multi-year population trends in `MetricValue.year` are **not used**; only a single (first) value per org unit/metric survives the pivot, then is repeated.

2) Cost duplication:

- `build_cost_dataframe(account, start_year, end_year)` pulls *all* cost breakdown lines for the account, then duplicates them into every year by setting `cost_year_for_analysis = year`.
- As implemented, it **does not filter cost lines by their `InterventionCostBreakdownLine.year`** before duplicating.

Practical implications:

- If your DB contains multiple unit-cost lines for different years (e.g. 2025 vs 2026), the current dataframe-building logic can cause **multiple cost rows to match the same year**, which can **inflate costs** through duplicated joins.
- `BudgetSettings.inflation_rate` is currently attached into the cost dataframe as `inflation_factor`, but the budgeting library does not apply inflation to unit costs in `generate_budget()`; it’s carried through as an unused field.

If you want truly year-specific budgeting:

- Population: pivot must include `year` (don’t drop it), and scenario years should match metric years.
- Costs: cost lines should be filtered (or mapped) so `cost_year_for_analysis` corresponds to the intended year-specific unit costs.

---

## Fallbacks, defaults, and “missing population” behavior

### Missing population metric types (hard errors)

`build_population_dataframe()` raises `ValidationError` in these cases:

- **No population MetricTypes** for the account
  - `"No population MetricTypes found for this account"`
- **No `POPULATION` MetricType**
  - `"MetricType with code 'POPULATION' does not exist for this account"`
- **No MetricValue rows** for the relevant metric types
  - `"No population data found"`

### Missing population columns (soft fallback to 0)

If some population MetricTypes are missing (e.g. no `POP_5_36_M` for vaccine eligibility), the dataframe builder:

- Adds those expected columns anyway and sets them to **0**
- Fills NaNs to **0**

So, for example:

- Missing `pop_pw` → IPTp quantities become 0 (no cost) rather than throwing
- Missing `pop_vaccine_5_36_months` → Vaccine quantities become 0
- Missing `pop_0_1`/`pop_1_2` → PMC quantities become 0
- Missing `pop_0_5` → SMC/ITN routine quantities become 0

### Missing population values for a specific org unit (soft fallback to 0)

Because the pivot creates NaNs where data is missing, and we fill NaNs with 0:

- An org unit without, say, `POP_UNDER_5` data will behave as if `pop_0_5 = 0` for that org unit.

### Missing unit costs (soft fallback to 0 cost)

In the budgeting library, unit costs are joined by `(code_intervention, type_intervention, unit, year)`.

If a cost line is missing for a required unit:

- the join produces NaN `unit_cost`
- rows are dropped by: `budget = budget[budget["cost_element"].notna() & (budget["cost_element"] != 0)]`
- resulting in **0 cost** for that missing component

### Missing BudgetSettings (hard error)

`build_cost_dataframe()` raises:

- `"BudgetSettings does not exist for this account"`

### Missing cost breakdown lines (hard error)

`build_cost_dataframe()` raises:

- `"No cost breakdown lines found for this account"`

### Assumptions fallback

- If an assumption is missing for an intervention when listing defaults, the API falls back to **0** (`DEFAULT_COST_ASSUMPTIONS.get(..., 0)`).
- When calculating budgets, the engine expects keys like `smc_coverage`, `smc_monthly_rounds`, etc. Our backend always starts from `DEFAULT_COST_ASSUMPTIONS.copy()`, so those keys should always be present during calculation.

---

## Output shapes (what the UI receives)

The `BudgetSerializer` returns:

- `id`, `name`, `scenario`, `assumptions`, `results`, `updated_at`

`results` is a list of:

- `year`
- `interventions`: list of `{ type, code, total_cost, total_pop, cost_breakdown[] }`
- `org_units_costs`: list of `{ org_unit_id, total_cost, interventions[] }`

In the backend, cost breakdown items are transformed from:

- `{ cost_class, cost }` → `{ category, cost }`

---

## Key files to read

- **API / orchestration**
  - `plugins/snt_malaria/api/budget/views.py`
  - `plugins/snt_malaria/api/budget/utils.py`
  - `plugins/snt_malaria/api/budget/serializers.py`
- **Data models**
  - `plugins/snt_malaria/models/budget.py`
  - `plugins/snt_malaria/models/cost_breakdown.py`
  - `plugins/snt_malaria/models/intervention.py`
  - `plugins/snt_malaria/models/budget_assumptions.py`
- **Budgeting engine (external library)**
  - `snt_malaria_budgeting/core/PATH_generate_budget.py`
  - `snt_malaria_budgeting/core/budget_calculator.py`

