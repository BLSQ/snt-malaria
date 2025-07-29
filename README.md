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

5. Make following changes to your `.env` in the main IASO repo:

```.env
APP_TITLE="SNT Malaria"
RDS_DB_NAME=snt_malaria  # Your choice of DB
PLUGINS=snt_malaria
```

6. Start IASO as you would normally:

```bash
docker-compose up
```

7. Set up your IASO account with e.g. name `Burkina Faso` and import the geopackage you can retrieve from https://iaso-snt-malaria.bluesquare.org/.

8. With the org unit pyramid set up correctly, you can now generate a set of interventions:

```bash
docker compose run --rm iaso manage seed_interventions
```

9. You can now import the covariate data sets (metrics), see the section below.

## OpenHEXA import

### UI

This adds a "hidden" page to /snt_malaria/import_openhexa_metrics/ that allows an admin user to manually launch the Django command to import the metrics into a specific account.

Example of workspace slug and dataset slug: snt-development and snt-results.

### Script

Script to fetch a specific dataset from an OpenHEXA workspace and import it into the MetricType and MetricValue tables:

```bash
docker compose run --rm iaso manage import_openhexa_metrics --workspace_slug <slug> --dataset_slug <slug> --account-id <id>
```

**Example for RDC data:**

```bash
docker compose run --rm iaso manage import_openhexa_metrics --workspace_slug snt-development --dataset_slug snt-results --account-id 2
```

To test make sure you set the env variables:

```.env
OPENHEXA_URL="https://api.openhexa.org/graphql/"
OPENHEXA_TOKEN = "XXX"
```

Note: You can get a OpenHEXA token by going to the pipelines page, create a new pipeline and choose "From OpenHEXA CLI" -> "Show" access token.

## Release workflow

This project follows [Semantic Versioning](http://semver.org/) and assumes you are using [Conventional Commit messages](https://www.conventionalcommits.org/).

Tagging and releases' creation are managed by [release-please](https://github.com/googleapis/release-please) that will create and maintain a pull request with the next release based on the commit messages of the new commits.

On creation of a new release, the following actions are performed:

- The `CHANGELOG.md` is updated with the new changes.
- A new release is created in GitHub.
