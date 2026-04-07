# Budgeting (Public Guide)

This guide explains **how the SNT Malaria budgeting feature calculates costs**. It is written for programme teams and analysts. It focuses on:

- **What population metrics you need to set up**
- **How each intervention’s budget is calculated**
- **What happens when inputs are missing (fallbacks)**
- **How multi‑year scenarios are handled**

---

## Metric layers to set up (required inputs)

Budgeting relies on two input “layers”:

### A. Population metrics (required)

You must have at least **Total population** for each planning unit (e.g., district).

- **Required**
  - **Total population** (`POPULATION`)

Other population metrics are **optional**, but required for some interventions to produce non‑zero budgets:

- **Children under 5** (`POP_UNDER_5`)
- **Children 0–1 year** (`POP_0_1_Y`)
- **Children 1–2 years** (`POP_1_2_Y`)
- **Pregnant women** (`POP_PREGNANT_WOMAN`)
- **Children 5–36 months** (vaccine target group) (`POP_5_36_M`)
- **Children 5–10 years** (`POP_5_10_Y`) (not currently used by the interventions listed below, but supported)
- **Urban population** (`POP_URBAN`) (not currently used by the interventions listed below, but supported)

What “planning unit” means:

- It is the geographic level you assign interventions to (e.g., district). Each planning unit should have population values.

### B. Unit cost lines (required)

For each intervention, budgeting needs unit costs split into categories (e.g., procurement, distribution, operational). The model supports categories like:

- Procurement
- Distribution
- Operational
- Supportive
- Other

Each cost line is defined for a **unit** such as “per ITN”, “per dose”, “per child”, etc. These units must match what the intervention calculation produces (examples are given below per intervention).

---

## Intervention calculations (how quantities and costs are computed)

Across all interventions, the same logic applies:

1. **Compute a target population** for the intervention in each planning unit.
2. **Convert the target population into quantities** (e.g., nets, doses, SPAQ packs) using standard parameters such as coverage and buffers.
3. **Multiply quantities by unit costs** and sum across cost categories to produce totals.

Below is the full list of interventions you may see in SNT, and whether they are currently covered by the budgeting calculation engine.

Legend:

- 🟢: calculated using **total population only**, plus matching unit cost lines.
- 🟡: calculated, but relies on **additional population segments** (e.g., under‑5, pregnant women, 5–36 months). If those metrics are missing, the budget can become **0** for affected areas/years.
- 🔴: currently ignored by the budget engine (no quantities/costs generated).


| Intervention (as shown in SNT) | Status | Budget logic used | Population used (default)         | Quantities computed (summary)                                                      | Unit costs expected                                          |
| ------------------------------ | ------ | ----------------- | --------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **CM**                         | 🔴     | —                 | —                                 | —                                                                                  | —                                                            |
| **CM Subsidy**                 | 🔴     | —                 | —                                 | —                                                                                  | —                                                            |
| **ICCM**                       | 🔴     | —                 | —                                 | —                                                                                  | —                                                            |
| **Dual AI (school)**           | 🔴     | —                 | —                                 | —                                                                                  | —                                                            |
| **PBO (school)**               | 🔴     | —                 | —                                 | —                                                                                  | —                                                            |
| **Standard Pyr (school)**      | 🔴     | —                 | —                                 | —                                                                                  | —                                                            |
| **IG2 (school)**               | 🔴     | —                 | —                                 | —                                                                                  | —                                                            |
| **SMC 3**                      | 🔴     | —                 | —                                 | —                                                                                  | —                                                            |
| **SMC 4**                      | 🔴     | —                 | —                                 | —                                                                                  | —                                                            |
| **SMC 5**                      | 🔴     | —                 | —                                 | —                                                                                  | —                                                            |
| **IRS**                        | 🔴     | —                 | —                                 | —                                                                                  | —                                                            |
| **LSM**                        | 🔴     | —                 | —                                 | —                                                                                  | —                                                            |
| **IPTp (SP)**                  | 🟡     | IPTp              | Pregnant women                    | SP doses = (pregnant women × ANC coverage × doses per woman) × buffer              | per SP                                                       |
| **Dual AI (routine)**          | 🟡     | ITN — Routine     | Children under 5 + pregnant women | ITNs = (target pop × routine coverage) × buffer                                    | per ITN                                                      |
| **PBO (routine)**              | 🟡     | ITN — Routine     | Children under 5 + pregnant women | ITNs = (target pop × routine coverage) × buffer                                    | per ITN                                                      |
| **Standard Pyr (routine)**     | 🟡     | ITN — Routine     | Children under 5 + pregnant women | ITNs = (target pop × routine coverage) × buffer                                    | per ITN                                                      |
| **IG2 (routine)**              | 🟡     | ITN — Routine     | Children under 5 + pregnant women | ITNs = (target pop × routine coverage) × buffer                                    | per ITN                                                      |
| **PMC (SP)**                   | 🟡     | PMC               | Children 0–1 and 1–2              | SP required computed from 0–1 and 1–2 populations, touchpoints, tablet factor      | per SP                                                       |
| **SMC (SP+AQ)**                | 🟡     | SMC               | Children under 5                  | SPAQ packs (3–11) and (12–59) from under‑5 population, proportions, rounds, buffer | per SPAQ pack 3–11 month olds per SPAQ pack 12–59 month olds |
| **R21**                        | 🟡     | Vaccine           | Children 5–36 months              | doses + children derived from target group, coverage, doses/child, buffer          | per dose per child                                           |
| **RTS,S**                      | 🟡     | Vaccine           | Children 5–36 months              | doses + children derived from target group, coverage, doses/child, buffer          | per dose per child                                           |
| **Dual AI (campaign)**         | 🟢     | ITN — Campaign    | Total population                  | nets + bales derived from population, coverage, divisor, buffer                    | per ITN per bale                                             |
| **PBO (campaign)**             | 🟢     | ITN — Campaign    | Total population                  | nets + bales derived from population, coverage, divisor, buffer                    | per ITN per bale                                             |
| **Standard Pyr (campaign)**    | 🟢     | ITN — Campaign    | Total population                  | nets + bales derived from population, coverage, divisor, buffer                    | per ITN per bale                                             |
| **IG2 (campaign)**             | 🟢     | ITN — Campaign    | Total population                  | nets + bales derived from population, coverage, divisor, buffer                    | per ITN per bale                                             |


---

## Fallback mechanisms (what happens if data is missing)

### A. If total population is missing

Budgeting cannot run without total population being defined at the account level.

- If **Total population** is not configured or no values exist, the budget calculation will fail with an error (because the system can’t build the population dataset).

### B. If an intervention-specific population metric is missing

If an optional population metric is missing (for example, pregnant women or children 5–36 months), the system treats that population as **0** for budgeting purposes.

Practical result:

- The intervention budget becomes **0** in any planning unit where its required population segment is missing.

Examples:

- Missing **pregnant women** → IPTp will cost 0.
- Missing **children 5–36 months** → Vaccine will cost 0.
- Missing **children under 5** → SMC and ITN routine will cost 0 (under default targeting).

### C. If unit costs are missing for a required unit

If an intervention produces a quantity (e.g., “per dose”) but there is **no matching unit cost line**, that component will contribute **0 cost** to the budget.

This usually shows up as:

- A missing cost category in the breakdown, or a lower-than-expected total.

---

## Multi‑year handling (how budgets work across years)

When a scenario covers multiple years, budgeting produces a **separate budget for each year** in the scenario range.

### What is consistent across years today (current behavior)

In the current implementation, the system constructs a “per‑year” input dataset by **duplicating data across the scenario years**. This has important implications:

#### Population: treated as a single snapshot, repeated every year

- If population metrics exist for multiple years, the budgeting input currently keeps **one value per planning unit** (per population metric), then **repeats that same value for every year** in the scenario.
- Practical implication: multi‑year population trends are **not reflected**; each year’s budget uses the same population numbers.

#### Unit costs: all cost lines are replicated into every scenario year

- Even though the UI allows editing costs by year, the current budgeting input construction does **not** select “the cost for the matching year” and does **not** apply a “fallback to nearest year”.
- Instead, it takes **all configured unit cost lines** and replicates them into each scenario year for calculation.
- Practical implication: if you have multiple year-specific cost lines for the same intervention/unit (e.g., a 2025 and a 2026 value), they can both be counted in the same scenario year, leading to **inflated/double-counted costs**.

### What this means in practice

- Budgets across years may be identical (because population is repeated), unless other scenario inputs differ.
- The “inflation rate” setting is stored, but the current budgeting calculations do **not automatically inflate unit costs year over year**.

### If you need true year-by-year variation

To reflect changing populations or year-specific unit costs, you will need:

- Population metrics captured and applied per year, and/or
- Year-specific unit costs that are selected per year (rather than replicated), with an explicit rule for missing years (e.g., “use latest available cost”).

---

## Quick setup checklist

- **Population**
  - Total population (`POPULATION`) for every planning unit
  - Add intervention-specific population metrics as needed (under‑5, pregnant women, 5–36 months, 0–1, 1–2)
- **Unit costs**
  - Ensure every intervention has cost lines for the units it uses (see “Cost units expected” per intervention)
  - Split costs into the categories you want to track (Procurement/Distribution/Operational/…)

