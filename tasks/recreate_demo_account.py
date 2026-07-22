import logging
import subprocess

from django.conf import settings

from beanstalk_worker import task_decorator
from iaso.models import Task


logger = logging.getLogger(__name__)


def log_and_progress_task(task: Task, message: str, progress: int):
    logger.info(message)
    task.report_progress_and_stop_if_killed(progress, message, 100)


def log_and_report_success(task: Task, message: str):
    logger.info(message)
    task.report_success(message)


def log_and_report_failure(task: Task, message: str, error: Exception):
    logger.exception(message)
    task.report_failure(error)


@task_decorator(task_name="recreate_demo_account")
def recreate_demo_account(task=None):
    if settings.ENVIRONMENT != "demo":
        log_and_report_success(task, "This task is meant to be run in the demo environment only. Skipping execution.")
        return

    command_for_logging = [
        "python",
        "manage.py",
        "recreate_demo_account",
    ]
    log_and_progress_task(task, f"Executing command: {' '.join(command_for_logging)}", 10)
    command = [
        *command_for_logging,
    ]
    try:
        process = subprocess.run(command, capture_output=True, text=True, check=True)
        log_and_report_success(task, f"Stdout:\n{process.stdout}")
    except subprocess.CalledProcessError as e:
        message = f"error executing command - return code = {e.returncode} - stderr = {e.stderr}"
        log_and_report_failure(task, message, e)
    except Exception as e:
        log_and_report_failure(task, "an unexpected error occurred", e)
