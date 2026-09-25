## Commands

- Run `docker-test` to execute tests.
- When creating migrations, run `docker-makemigrations`, then format the generated migration file with ruff.
- When adding or modifying backend strings wrapped in `_`, run `docker-make-translations`.

## Code style

- Write minimal comments. Code should be self-explanatory through naming; only comment when the WHY isn't obvious from the code itself.
- Favor clear naming over clever tricks. When a block of logic gets complicated, extract it into a well-named function/method/util instead of adding comments to explain it.

## Backend

- Favor fat serializers / thin views: validation and persistence logic (including `transaction.atomic()` for delete+recreate patterns) belongs in the serializer's `validate_*` / `save()` methods. Views should just call `serializer.is_valid()` / `serializer.save()` and return the response.

## Testing

- Name test methods to describe the scenario and expected behavior (e.g. `test_metric_value_list_filter_by_reference_year_includes_year_match_and_timeless`). Add a one-line docstring restating that in plain English when the name alone isn't enough.

## Frontend

- Keep styles in a separate object that satisfies `SxStyles`.
- Add/update translations whenever `MESSAGES` is added or modified.
- Type components as `FC<Props>` with named exports (not default exports).
- Wrap handlers passed to children or effects in `useCallback`.
- Don't use array index as a React key — use `React.Children.toArray` instead.
- Prefer arrow functions whenever possible.