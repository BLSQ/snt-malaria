# OpenHexa workspace config keys.
# Dataset carrying SNT_config.json (dataset identifiers + country code).
CONFIG_DATASET_KEY = "snt_configuration_dataset"
# Dataset carrying the data layer definitions file.
METADATA_DATASET_KEY = "snt_metadata_dataset"
# Optional override of the data layer definitions filename (defaults to DEFAULT_METADATA_FILENAME).
METADATA_FILENAME_KEY = "snt_metadata_filename"

# Name of the background task that loads a data layer's values (Task.name).
IMPORT_TASK_NAME = "import_openhexa_data_layer"
