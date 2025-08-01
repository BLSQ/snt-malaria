from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction

from iaso.models import Account, Profile


class Command(BaseCommand):
    help = "Set up a new dummy Account with name 'Burkina Faso' and connect admin user to it"

    def handle(self, *args, **options):
        with transaction.atomic():
            # Check if admin user exists
            try:
                admin_user = User.objects.get(username="admin")
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR("Admin user does not exist. Please create an admin user first."))
                return

            # Check if Burkina Faso account already exists
            account, created = Account.objects.get_or_create(name="Burkina Faso")

            if created:
                self.stdout.write(self.style.SUCCESS(f"Successfully created Account: {account.name}"))
            else:
                self.stdout.write(self.style.WARNING(f"Account '{account.name}' already exists"))

            # Check if profile already exists for this user and account
            profile, profile_created = Profile.objects.get_or_create(user=admin_user, account=account)

            if profile_created:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Successfully created Profile connecting user '{admin_user.username}' to account '{account.name}'"
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"Profile for user '{admin_user.username}' and account '{account.name}' already exists"
                    )
                )

            self.stdout.write(self.style.SUCCESS("Setup completed successfully!"))
