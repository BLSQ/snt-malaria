Script to fetch a specific dataset from an OpenHEXA workspace and import it into the MetricType and MetricValue tables:


```./manage.py import_openhexa_metrics --workspace_slug <slug> --dataset_slug <slug> --account-id <id>```

### Example for RDC data:
```./manage.py import_openhexa_metrics --workspace_slug snt-development --dataset_slug snt-results --account-id 2```
To test make sure you set the env variables:

OPENHEXA_URL="https://api.openhexa.org/graphql/"
OPENHEXA_TOKEN = "XXX"
You can get the OpenHEXA token by going to the pipelines page, create a new one and choose "From OpenHEXA CLI" -> "Show" access token


![image](https://private-user-images.githubusercontent.com/2719739/458790527-0b960325-ef52-4e97-acf3-89cd24dc9cde.png?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NTEwMjg3NzksIm5iZiI6MTc1MTAyODQ3OSwicGF0aCI6Ii8yNzE5NzM5LzQ1ODc5MDUyNy0wYjk2MDMyNS1lZjUyLTRlOTctYWNmMy04OWNkMjRkYzljZGUucG5nP1gtQW16LUFsZ29yaXRobT1BV1M0LUhNQUMtU0hBMjU2JlgtQW16LUNyZWRlbnRpYWw9QUtJQVZDT0RZTFNBNTNQUUs0WkElMkYyMDI1MDYyNyUyRnVzLWVhc3QtMSUyRnMzJTJGYXdzNF9yZXF1ZXN0JlgtQW16LURhdGU9MjAyNTA2MjdUMTI0NzU5WiZYLUFtei1FeHBpcmVzPTMwMCZYLUFtei1TaWduYXR1cmU9YmUyZGMzNGE5MWNlMjQ3MTFkYjEyZDFmZjg2Y2FmMjU2NDU5MzlmNTliM2I3Nzc2ZDZhMGU1ZmZhMTFhMTgxMiZYLUFtei1TaWduZWRIZWFkZXJzPWhvc3QifQ.ugBO0MZ87FGbQb9FYMOxKiY2IItO69iemOYftjx4lC4)
