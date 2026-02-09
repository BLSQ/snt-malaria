# SNT Malaria IASO plugin

This repo contains a IASO plugin for the web app of the Malaria Subnational Tailoring project.

## Getting started

To start development on your local machine, you can perform the following steps:

1. Make sure you have a IASO repo at your disposal.

```bash
git clone git@github.com:BLSQ/iaso.git
```

2. Inside your IASO repo, add the SNT repo to the `/plugins` folder:

```bash
cd plugins
git clone git@github.com:BLSQ/snt-malaria.git snt_malaria
```

3. Prepare your `.env` (in the root of the main IASO repo):

```.env
cp .env.dist .env
```

Then open the `.env`and update those variables:

```.env
APP_TITLE="SNT Malaria"
RDS_DB_NAME=snt_malaria
PLUGINS=snt_malaria
```

4. Start your IASO container:

```bash
docker compose up
```

If you get a message saying that the database does not exist, you can connect to your Postgres instance and create the database:

```bash
psql -h localhost -p 5433 -U postgres # password is postgres
# And then:
create database snt_malaria;
```

Or one-line:

```bash
docker compose exec db psql -U postgres -c "create database snt_malaria"
```

5. Create account and data:

With your containers running, run the script (in a different tab) to set up an initial account

Dummy account and values:

```bash
docker compose run iaso manage set_up_burkina_faso_account
```

6. Using the credentials you just received, you should now be able to log in and create a first scenario.

## Configuration

The planning page requires a configuration entry in the Iaso datastore to know which org unit types represent the country level and the intervention level. Without this configuration (or if it contains invalid values), the planning sidebar will only show the "National" display level.

To set it up, go to the Django admin for your account and create a datastore entry with the key `snt_malaria_config` and the following JSON data:

```json
{
  "country_org_unit_type_id": <id>,
  "intervention_org_unit_type_id": <id>
}
```

Replace `<id>` with the actual org unit type IDs for your country. Both values must be numbers.

## OpenHEXA import

This section describes how to fetch real data layers from OpenHEXA.

The data layers to display on the maps are retrieved by fetching a specific dataset from an OpenHEXA workspace. A script then processes this dataset to insert it into the `MetricType` and `MetricValue` tables.

First, make sure you add the following variables to your `.env` file:

```.env
ENCRYPTED_TEXT_FIELD_KEY="XXX"
```

_Note: You can get a OpenHEXA token by going to the pipelines page, create a new pipeline and choose "From OpenHEXA CLI" -> "Show" access token._

Now, you'll need to create an OpenHexa Instance and an OpenHexa Workspace from api interface.
For OpenHexa Instance:

- name: choose one that fits your case
- url: https://api.openhexa.org/graphql/
- token

For OpenHexa Workspace:

- Select the OpenHexa instance you have create just before
- Select the account you want
- Enter your slug, you can find it in open hexa url (IE: https://app.openhexa.org/workspaces/bfa-snt-process => bfa-snt-process)
- Add snt_results_dataset in the config:
  `{"snt_results_dataset": "snt-results"}`

Now there are two ways you can import metrics from an OpenHEXA workspace:

1. Using the Django command:

```bash
docker compose run --rm iaso manage import_openhexa_metrics --account-id <id>
```

2. Via the "hidden" admin (only accessible to superusers) page on http://localhost:8081/snt_malaria/import_openhexa_metrics/ that allows an admin user to manually launch the Django command to import the metrics into a specific account.

## Release workflow

This project follows [Semantic Versioning](http://semver.org/) and assumes you are using [Conventional Commit messages](https://www.conventionalcommits.org/).

Tagging and releases' creation are managed by [release-please](https://github.com/googleapis/release-please) that will create and maintain a pull request with the next release based on the commit messages of the new commits.

On creation of a new release, the following actions are performed:

- The `CHANGELOG.md` is updated with the new changes.
- A new release is created in GitHub.

## Budgeting package

To debug the budgeting plugin, you can checkout the repo [snt-malaria-budgeting](https://github.com/BLSQ/snt-malaria-budgeting) in the parent folder of iaso repo.
(request access if you don't have it).

If you want to check it out somewhere else, you will need to change the docker-compose mount for this package: `../snt-malaria-budgeting:/opt/snt-malaria-budgeting`

Now, you can go to `docker/django/Dockerfile` and uncomment `ENV PYTHONPATH="/opt/snt-malaria-budgeting:${PYTHONPATH}"`

Once done, you can restart iaso container to activate hot reload.
From there, if you modify the package source, it should trigger a reload and be reflected in snt-malaria.
