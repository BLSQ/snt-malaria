import difflib
import io
import time

import pandas as pd

from django.core.management.base import BaseCommand

from iaso.models.base import Account
from iaso.models.org_unit import OrgUnit


columns_map = {
    "LGA": "org_unit_name",
    "CM_current": "CM - cm_public",
    "CM_SUBSIDY_current": "CM subsidy - cm",
    "AIX2_R_current": "Dual AI - itn_routine",
    "PYR_R_current": "Standard Pyrethroid - itn_routine",
    "PBO_R_current": "PBO - itn_routine",
    "AIX2_C_current": "Dual AI - itn_campaign",
    "PYR_C_current": "Standard Pyrethroid - itn_campaign",
    "PBO_C_current": "PBO - itn_campaign",
    "SMC_current": "SMC (SP+AQ) - smc",
    "PMC_current": "PMC (SP) - pmc",
    "LSM_current": "LSM - lsm",
    "IPTP_current": "IPTp (SP) - iptp",
    "Vaccine_current": "R21 - vacc",
}

extra_columns = ["CM Subsidy - cm_subsidy"]

org_unit_hard_map = {
    "Ola-oluwa": "Ola Oluwa",
    "Ilemeji": "Ilejemeje",  # example mapping
    "Egbado North": "Yewa North",  # ambiguous, handled separately
    "Egbado South": "Yewa South",  # ambiguous, handled separately
}


class Command(BaseCommand):
    help = "Import CSV into pandas DataFrame, normalize and match LGA names to OrgUnit ids."

    def add_arguments(self, parser):
        parser.add_argument("csv_file", help="Path to CSV file to load")
        parser.add_argument("--sep", default=",", help="CSV delimiter (default ',')")
        parser.add_argument("--encoding", default="utf-8", help="File encoding (default 'utf-8')")
        parser.add_argument(
            "--drop-columns",
            nargs="*",
            default=["scenario", "insecticide resistance", "vaccine Efficacy", "coverage"],
            help="List of column names to drop (default commonly unwanted columns)",
        )
        parser.add_argument(
            "--match-cutoff",
            type=float,
            default=0.8,
            help="Fuzzy matching cutoff ratio (default 0.8)",
        )
        parser.add_argument("--account-id", type=int)
        parser.add_argument("--lga-org-unit-type", type=int)

    def handle(self, *args, **options):
        csv_file = options["csv_file"]
        sep = options["sep"]
        encoding = options["encoding"]
        drop_columns = options["drop_columns"]
        cutoff = options["match_cutoff"]
        account_id = options["account_id"]
        lga_org_unit_type = options["lga_org_unit_type"]

        account = Account.objects.filter(id=account_id).first()

        try:
            # read CSV into a pandas DataFrame; keep strings for reliable matching
            df = pd.read_csv(csv_file, sep=sep, encoding=encoding, dtype=str, low_memory=False)
            # Filter rows where the 'scenario' column (case-insensitive) is 'NSP'
            scenario_col = next((c for c in df.columns if c.lower() == "scenario"), None)
            if scenario_col:
                df = df[df[scenario_col].str.strip().str.upper() == "NSP"]
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Failed to read CSV '{csv_file}': {e}"))
            return

        # Normalize column names and drop unwanted columns
        df.columns = df.columns.str.strip()
        df.drop(columns=drop_columns, inplace=True, errors="ignore")

        # Locate the LGA column case-insensitively
        lga_col = next((c for c in df.columns if c.lower() == "lga"), None)
        if lga_col is None:
            self.stdout.write(self.style.WARNING("No 'LGA' column found; skipping org unit matching."))
            # Still print DataFrame summary
            buf = io.StringIO()
            df.info(buf=buf)
            self.stdout.write(buf.getvalue())
            self.stdout.write(self.style.SUCCESS(df.head().to_string()))
            return

        # Prepare mapping from raw LGA string -> orgunit id (or None)
        unique_vals = pd.Series(df[lga_col].dropna().astype(str).str.strip().unique())
        mapping = {}

        # helper to grab the best match from a queryset using fuzzy ratio
        def best_from_qs(qs, target):
            best_obj = None
            best_ratio = 0.0
            for o in qs:
                ratio = difflib.SequenceMatcher(None, o.name.lower(), target.lower()).ratio()
                if ratio > best_ratio:
                    best_ratio = ratio
                    best_obj = o
            return best_obj, best_ratio

        for raw in unique_vals:
            name = raw.strip()
            if not name:
                mapping[raw] = None
                continue
            # apply hardcoded mapping first
            if name in org_unit_hard_map:
                name = org_unit_hard_map[name]

            # try exact case-insensitive match
            exact_qs = OrgUnit.objects.filter(
                name__iexact=name,
                org_unit_type=lga_org_unit_type,
                version=account.default_version,
            )
            if exact_qs.count() == 1:
                mapping[raw] = exact_qs.first().id
                continue
            if exact_qs.exists():
                mapping[raw] = exact_qs[1].id if exact_qs.first().id in mapping.values() else None
                self.stdout.write(
                    self.style.WARNING(f"Multiple exact OrgUnit matches for '{name}' -> using id {mapping[raw]}")
                )
                continue

            # try icontains (substrings)
            contains_qs = OrgUnit.objects.filter(
                org_unit_type=lga_org_unit_type,
                name__icontains=name,
                version=account.default_version,
            )
            if contains_qs.count() == 1:
                mapping[raw] = contains_qs.first().id
                continue
            if contains_qs.exists():
                best_obj, ratio = best_from_qs(contains_qs, name)
                if ratio >= cutoff:
                    mapping[raw] = best_obj.id
                    self.stdout.write(self.style.SUCCESS(f"Matched '{name}' -> '{best_obj.name}' (ratio {ratio:.2f})"))
                else:
                    mapping[raw] = None
                    self.stdout.write(
                        self.style.WARNING(
                            f"Ambiguous contains matches for '{name}', no confident pick (best ratio {ratio:.2f})."
                        )
                    )
                continue

            # fall back to fuzzy matching across all OrgUnit names
            all_names = list(
                OrgUnit.objects.filter(
                    org_unit_type=lga_org_unit_type,
                    version=account.default_version,
                ).values_list("name", flat=True)
            )
            close = difflib.get_close_matches(name, all_names, n=1, cutoff=cutoff)
            if close:
                matched_name = close[0]
                matched_objs = OrgUnit.objects.filter(
                    name=matched_name,
                    org_unit_type=lga_org_unit_type,
                    version=account.default_version,
                )

                mapping[raw] = next(
                    matched_obj.id for matched_obj in matched_objs if matched_obj.id not in mapping.values()
                )
                self.stdout.write(self.style.SUCCESS(f"Fuzzy matched '{name}' -> '{matched_name}'"))
            else:
                mapping[raw] = None
                self.stdout.write(self.style.WARNING(f"No OrgUnit match found for '{name}'"))

        # Map the LGA column to org_unit_id. Keep NaNs where no match.
        df.insert(0, "org_unit_id", df[lga_col].astype(str).str.strip().replace({"nan": None}).map(mapping))

        # summary
        matched = df["org_unit_id"].notna().sum()
        total = len(df)
        self.stdout.write(self.style.SUCCESS(f"Matched org units: {matched}/{total} rows"))

        # Print DataFrame info and preview
        buf = io.StringIO()

        df = df.rename(columns_map, axis="columns")
        for col in extra_columns:
            df[col] = 0

        # Keep only columns in columns_map and extra_columns (plus org_unit_id)
        keep_cols = ["org_unit_id"] + list(columns_map.values()) + extra_columns
        df = df[[col for col in keep_cols if col in df.columns]]

        df.info(buf=buf)

        df.to_csv("/opt/NSP.csv")

        self.stdout.write(buf.getvalue())
        self.stdout.write(self.style.SUCCESS(df.head().to_string()))

        time.sleep(60 * 10)
