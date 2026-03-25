import json

from collections import Counter

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from iaso.models import Account, OrgUnit
from plugins.snt_malaria.models import ImpactOrgUnitMapping


class Command(BaseCommand):
    help = """Load impact org-unit mappings from a JSON mapping file.

Creates or updates ImpactOrgUnitMapping rows that link Iaso org units
to reference strings used by external impact databases.

The file is an array of nodes, each with:
  - "name" (required): matches an Iaso org unit name
  - "reference" (optional): the impact-DB reference to assign
  - "children" (optional): nested array of the same structure, scoped to
    org units under this parent

Hierarchy nodes scope their children to org units under that parent.
Org units not matched by any node are skipped.

Example mapping file:

  [
    {
      "name": "Aboh Mbaise",
      "reference": "Aboh-Mbaise"
    },
    {
      "name": "Kwara",
      "reference": "Kwara-State",
      "children": [
        {
          "name": "Irepodun",
          "reference": "Irepodun1"
        },
        {
          "name": "Ifelodun",
          "reference": "Ifelodun1"
        }
      ]
    },
    {
      "name": "Osun",
      "children": [
        {
          "name": "Irepodun",
          "reference": "Irepodun2"
        },
        {
          "name": "Ifelodun",
          "reference": "Ifelodun2"
        }
      ]
    }
  ]

Flat entries map by name directly. Hierarchy entries disambiguate
same-name org units by scoping them under a parent. A node can have
both "reference" (mapped itself) and "children" (scoping descendants).
Nesting can be arbitrarily deep."""

    def add_arguments(self, parser):
        parser.add_argument(
            "--account",
            type=str,
            help="Name of the account whose org units should be mapped.",
        )
        parser.add_argument(
            "--account-id",
            type=int,
            help="ID of the account whose org units should be mapped.",
        )
        parser.add_argument(
            "--mapping-file",
            type=str,
            required=True,
            help="Path to a JSON mapping file (array of {name, reference?, children?} nodes).",
        )
        parser.add_argument(
            "--overwrite",
            action="store_true",
            default=False,
            help="Overwrite existing mappings. Without this flag only unmapped org units are processed.",
        )

    def handle(self, *args, **options):
        account_name = options["account"]
        account_id = options["account_id"]
        mapping_file_path = options["mapping_file"]
        overwrite = options["overwrite"]

        if not account_name and not account_id:
            raise CommandError("Provide either --account (name) or --account-id (ID).")
        if account_name and account_id:
            raise CommandError("Provide only one of --account or --account-id, not both.")

        try:
            with open(mapping_file_path) as f:
                mapping_nodes = json.load(f)
        except FileNotFoundError:
            raise CommandError(f"Mapping file not found: {mapping_file_path}")
        except json.JSONDecodeError as e:
            raise CommandError(f"Invalid JSON in mapping file: {e}")

        if not isinstance(mapping_nodes, list):
            raise CommandError("Mapping file must contain a JSON array of nodes.")

        lookup = _build_lookup(mapping_nodes)

        identifier = account_id if account_id else account_name
        try:
            if account_id:
                account = Account.objects.get(id=account_id)
            else:
                account = Account.objects.get(name=account_name)
        except Account.DoesNotExist:
            raise CommandError(f"Account '{identifier}' does not exist.")

        default_version = account.default_version
        if default_version is None:
            raise CommandError(f"Account '{identifier}' has no default version.")

        self.stdout.write("Loading org units...")
        org_units = OrgUnit.objects.filter(version=default_version)
        if not overwrite:
            org_units = org_units.exclude(impact_mapping__isnull=False)

        org_unit_list = list(org_units)
        self.stdout.write(f"Loaded {len(org_unit_list)} org units.")
        if not org_unit_list:
            self.stdout.write(self.style.WARNING("No org units to process."))
            return

        self._validate_uniqueness(org_unit_list, lookup)

        self.stdout.write("Writing mappings...")
        created_count = 0
        updated_count = 0
        skipped_count = 0
        with transaction.atomic():
            for org_unit in org_unit_list:
                self.stdout.write(f"  Processing: {org_unit.name} (id={org_unit.id})")
                ancestors = _build_ancestors(org_unit)
                reference = _resolve(ancestors, lookup)
                if reference is None:
                    skipped_count += 1
                    continue
                _, created = ImpactOrgUnitMapping.objects.update_or_create(
                    org_unit=org_unit,
                    defaults={"reference": reference},
                )
                if created:
                    created_count += 1
                else:
                    updated_count += 1
        self.stdout.write("Committed.")

        self.stdout.write(
            self.style.SUCCESS(f"Account '{identifier}': created {created_count}, updated {updated_count} mapping(s).")
        )
        if skipped_count:
            self.stdout.write(f"Skipped {skipped_count} org unit(s) with no mapping match.")

    def _validate_uniqueness(self, org_unit_list, lookup):
        """Validate that every mapping node resolves unambiguously.

        For each node in the lookup tree, count how many org units match at
        that scope level. If a node with a reference matches 2+ org units,
        the mapping is ambiguous and a deeper hierarchy is needed.
        """
        name_counts_by_parent = Counter()
        global_name_counts = Counter()
        for ou in org_unit_list:
            parent_name = ou.parent.name if ou.parent else None
            name_counts_by_parent[(parent_name, ou.name)] += 1
            global_name_counts[ou.name] += 1

        self._check_scope(lookup, global_name_counts, name_counts_by_parent, scope_label="top-level")

    def _check_scope(self, scope_lookup, global_name_counts, name_counts_by_parent, scope_label):
        for name, node in scope_lookup.items():
            if node["reference"] is not None:
                if scope_label == "top-level":
                    count = global_name_counts.get(name, 0)
                else:
                    count = name_counts_by_parent.get((scope_label, name), 0)
                if count > 1:
                    raise CommandError(
                        f"Ambiguous mapping: {count} org units named '{name}' "
                        f"in scope '{scope_label}'. Use a deeper hierarchy to disambiguate."
                    )
            if node["children"]:
                self._check_scope(node["children"], global_name_counts, name_counts_by_parent, scope_label=name)


def _build_lookup(nodes):
    """Convert an array of mapping nodes into a nested dict keyed by name."""
    lookup = {}
    for node in nodes:
        name = node["name"]
        lookup[name] = {
            "reference": node.get("reference"),
            "children": _build_lookup(node.get("children", [])),
        }
    return lookup


def _build_ancestors(org_unit):
    """Build the ancestor path bottom-up: [self.name, parent.name, grandparent.name, ...]."""
    ancestors = []
    current = org_unit
    while current:
        ancestors.append(current.name)
        current = current.parent
    return ancestors


def _resolve(ancestors, top_lookup):
    """Resolve a reference by walking the ancestor path against the lookup tree.

    Tries matching from the farthest ancestor down to self. Returns None
    if no mapping matches.
    """
    for depth in range(len(ancestors) - 1, -1, -1):
        name = ancestors[depth]
        if name in top_lookup:
            ref = _descend(top_lookup[name], ancestors, depth - 1)
            if ref is not None:
                return ref
    return None


def _descend(node, ancestors, depth):
    """Recursively descend through the lookup tree matching ancestor names."""
    if depth < 0:
        return node["reference"]
    name = ancestors[depth]
    if node["children"] and name in node["children"]:
        return _descend(node["children"][name], ancestors, depth - 1)
    return None
