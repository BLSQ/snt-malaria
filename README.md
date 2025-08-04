# SNT Malaria IASO plugin

This repo contains a IASO plugin for the web app of the Malaria Subnational Tailoring project.

## Getting started

To start development on your local machine, you can perform the following steps:

1. Make sure you have a IASO repo at your disposal.

```bash
git clone git@github.com:BLSQ/iaso.git
```

2. Switch to the SNT branch of your IASO repo. To be able to move fast, we'll add changes required on IASO on this branch. On the medium term, this code will be merged back into main IASO.

```bash
git checkout snt-malaria
```

3. Inside your IASO repo, add the SNT repo to the `/plugins` folder:

```bash
cd plugins
git clone git@github.com:BLSQ/snt-malaria.git
```

4. Rename the SNT repo to `snt_malaria`:

```bash
mv snt-malaria snt_malaria
```

5. Prepare your `.env` (in the root of the main IASO repo):

```.env
cp .env.dist .env
```

6. Start your IASO container:

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

`docker compose exec db psql -U postgres -c "create database snt_malaria"`

7. With your containers running, run the script (in a different tab) to set up an initial example account:

```bash
docker compose run iaso manage set_up_burkina_faso_account
```

8. Using the credentials you just received, you should now be able to log in and create a first scenario.

## OpenHEXA import

This section describes how to fetch real data layers from OpenHEXA.

The data layers to display on the maps are retrieved by fetching a specific dataset from an OpenHEXA workspace. A script then processes this dataset to insert it into the `MetricType` and `MetricValue` tables.

First, make sure you add the following variables to your `.env` file:

```.env
OPENHEXA_URL="https://api.openhexa.org/graphql/"
OPENHEXA_TOKEN="XXX"
```

_Note: You can get a OpenHEXA token by going to the pipelines page, create a new pipeline and choose "From OpenHEXA CLI" -> "Show" access token._

Now there are two ways you can import metrics from an OpenHEXA workspace:

1. Using the Django command:

```bash
docker compose run --rm iaso manage import_openhexa_metrics --workspace_slug <slug> --dataset_slug <slug> --account-id <id>

# Example for RDC data:**
docker compose run --rm iaso manage import_openhexa_metrics --workspace_slug snt-development --dataset_slug snt-results --account-id 2
```

2. Via the "hidden" admin (only accessible to superusers) page on http://localhost:8081/snt_malaria/import_openhexa_metrics/ that allows an admin user to manually launch the Django command to import the metrics into a specific account. Example of workspace slug and dataset slug: `snt-development` and `snt-results`.

## Release workflow

This project follows [Semantic Versioning](http://semver.org/) and assumes you are using [Conventional Commit messages](https://www.conventionalcommits.org/).

Tagging and releases' creation are managed by [release-please](https://github.com/googleapis/release-please) that will create and maintain a pull request with the next release based on the commit messages of the new commits.

On creation of a new release, the following actions are performed:

- The `CHANGELOG.md` is updated with the new changes.
- A new release is created in GitHub.
