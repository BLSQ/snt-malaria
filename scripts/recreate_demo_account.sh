#!/bin/bash
set -e
export $(cat /opt/elasticbeanstalk/deployment/env | xargs)

# Only run this script in demo environment on the main web server
if [ "$SENTRY_ENVIRONMENT" != "demo" ]; then
    echo "Environment is not 'demo', don't execute sync script, exiting"
    exit 0
fi
if [ "$WORKER" = "true" ]; then
    echo "WORKER is set to true, don't execute sync script, exiting"
    exit 0
fi

# Script to recreate the Burkina Faso demo account
# This script is intended to run as a cron job on AWS Elastic Beanstalk

# Set up logging
LOGFILE="/var/log/snt_malaria_recreate_demo.log"
exec >> $LOGFILE 2>&1

echo "========================================="
echo "Starting demo account recreation: $(date)"
echo "========================================="

# Navigate to the application directory
cd /var/app/current

# Activate the virtual environment (Elastic Beanstalk standard location)
if [ -f /var/app/venv/*/bin/activate ]; then
    source /var/app/venv/*/bin/activate
else
    echo "ERROR: Could not find virtual environment"
    exit 1
fi

# Run the Django management command
echo "Executing recreate_demo_account management command..."
python manage.py recreate_demo_account

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "========================================="
    echo "Demo account recreation completed successfully: $(date)"
    echo "========================================="
else
    echo "========================================="
    echo "Demo account recreation failed with exit code $EXIT_CODE: $(date)"
    echo "========================================="
    exit $EXIT_CODE
fi
