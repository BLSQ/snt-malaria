# SNT Malaria IASO plugin

This repo contains a IASO plugin for the web app of the Malaria Subnational Tailoring project.

## Local development

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

4. Make following changes to your `.env` in the main IASO repo:

```.env
APP_TITLE="SNT Malaria"
RDS_DB_NAME=snt_malaria  # Your choice of DB
PLUGINS=snt_malaria
```

5. Start IASO as you would normally:

```bash
docker-compose up
```

6. Set up your IASO account with e.g. name `Burkina Faso` and import the geopackage you can retrieve from https://iaso-snt-malaria.bluesquare.org/.
