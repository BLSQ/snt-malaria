import django.db.models.fields.json

from django.db import migrations

import iaso.utils.validators


class Migration(migrations.Migration):
    dependencies = [
        ("snt_malaria", "0030_impactorgunitmapping"),
    ]

    operations = [
        migrations.AlterField(
            model_name="scenariorule",
            name="matching_criteria",
            field=django.db.models.fields.json.JSONField(
                blank=True,
                null=True,
                validators=[
                    iaso.utils.validators.JSONSchemaValidator(
                        schema={
                            "$schema": "http://json-schema.org/draft-07/schema#",
                            "oneOf": [
                                {
                                    "type": "object",
                                    "required": ["and"],
                                    "additionalProperties": False,
                                    "properties": {
                                        "and": {
                                            "type": "array",
                                            "minItems": 1,
                                            "items": {"$ref": "#/$defs/condition"},
                                        }
                                    },
                                },
                                {
                                    "type": "object",
                                    "required": ["all"],
                                    "additionalProperties": False,
                                    "properties": {"all": {"const": True}},
                                },
                            ],
                            "$defs": {
                                "condition": {
                                    "type": "object",
                                    "minProperties": 1,
                                    "maxProperties": 1,
                                    "additionalProperties": False,
                                    "patternProperties": {
                                        "^(==|<=|>=|<|>)$": {
                                            "type": "array",
                                            "minItems": 2,
                                            "maxItems": 2,
                                            "items": [
                                                {"$ref": "#/$defs/varObject"},
                                                {"$ref": "#/$defs/value"},
                                            ],
                                        }
                                    },
                                },
                                "varObject": {
                                    "type": "object",
                                    "required": ["var"],
                                    "additionalProperties": False,
                                    "properties": {"var": {"type": "integer"}},
                                },
                                "value": {
                                    "anyOf": [
                                        {"type": "string", "minLength": 1},
                                        {"type": "number"},
                                        {"type": "integer"},
                                        {"type": "boolean"},
                                    ]
                                },
                            },
                        }
                    )
                ],
            ),
        ),
    ]
