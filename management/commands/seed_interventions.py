from django.core.management.base import BaseCommand

from iaso.models import Account, User
from plugins.snt_malaria.models.intervention import InterventionFamily, Intervention


class Command(BaseCommand):
    help = "Populate the database with intervention categories and interventions"

    def handle(self, *args, **options):
        categories_and_interventions = {
            "Vaccination": {
                "description": "Strategies to prevent malaria through immunization.",
                "interventions": [
                    {
                        "name": "RTS,S/AS01",
                        "description": "The first malaria vaccine, primarily targeting Plasmodium falciparum.",
                    },
                    # Add more vaccines with descriptions as they become available
                ],
            },
            "Chemoprevention": {
                "description": "The use of medications to prevent the onset of malaria in high-risk populations.",
                "interventions": [
                    {
                        "name": "IPTp",
                        "description": "Intermittent Preventive Treatment in pregnancy to protect pregnant women from malaria.",
                    },
                    {
                        "name": "IPTi",
                        "description": "Intermittent Preventive Treatment in infants to reduce the burden of malaria in young children.",
                    },
                    {
                        "name": "SMC",
                        "description": "Seasonal Malaria Chemoprevention for children under five in areas of highly seasonal transmission.",
                    },
                ],
            },
            "Insecticide-Treated Nets (ITNs)": {
                "description": "Nets treated with insecticides to protect individuals from mosquito bites while sleeping.",
                "interventions": [
                    {
                        "name": "LLIN",
                        "description": "Long-Lasting Insecticidal Nets that remain effective for several years without re-treatment.",
                    }
                ],
            },
            "Indoor Residual Spraying (IRS)": {
                "description": "Spraying the inside walls of homes with insecticides to kill mosquitoes and reduce malaria transmission.",
                "interventions": [
                    {"name": "IRS with DDT", "description": "Indoor spraying using DDT to eliminate adult mosquitoes."},
                    {
                        "name": "IRS with pyrethroids",
                        "description": "Using pyrethroid insecticides for effective mosquito control indoors.",
                    },
                    {
                        "name": "IRS with carbamates",
                        "description": "Application of carbamate insecticides for indoor mosquito control.",
                    },
                ],
            },
            "Antimalarial Medications": {
                "description": "Drugs used to treat and prevent malaria infections.",
                "interventions": [
                    {
                        "name": "ACT",
                        "description": "Artemisinin-based Combination Therapy, the standard treatment for uncomplicated P. falciparum malaria.",
                    },
                    {
                        "name": "Chloroquine",
                        "description": "An antimalarial drug used primarily for P. vivax and P. ovale infections.",
                    },
                    {
                        "name": "Mefloquine",
                        "description": "A medication used for malaria prevention and treatment, particularly in resistant areas.",
                    },
                    {
                        "name": "Primaquine",
                        "description": "Used to eliminate liver stages of P. vivax and P. ovale to prevent relapse.",
                    },
                ],
            },
            "Rapid Diagnostic Tests (RDTs)": {
                "description": "Tests that quickly diagnose malaria in the field without the need for laboratory facilities.",
                "interventions": [
                    {
                        "name": "PfHRP2-based RDT",
                        "description": "Rapid tests that detect the histidine-rich protein 2 antigen of Plasmodium falciparum.",
                    },
                    {
                        "name": "pLDH-based RDT",
                        "description": "Tests based on lactate dehydrogenase detection for diagnosing various Plasmodium species.",
                    },
                ],
            },
            "Environmental Management": {
                "description": "Approaches to reduce mosquito breeding sites through environmental modifications.",
                "interventions": [
                    {
                        "name": "Larval Source Management",
                        "description": "Controlling mosquito larvae by managing water bodies and breeding sites.",
                    },
                    {
                        "name": "Drainage and water management",
                        "description": "Strategies to eliminate stagnant water to reduce mosquito breeding.",
                    },
                ],
            },
            # "Public Health Education": {
            #     "description": "Educational initiatives to raise awareness about malaria prevention and control.",
            #     "interventions": [
            #         {
            #             "name": "Community awareness programs",
            #             "description": "Programs designed to educate communities about malaria prevention.",
            #         },
            #         {
            #             "name": "School-based education initiatives",
            #             "description": "Educational efforts in schools to inform children about malaria.",
            #         },
            #     ],
            # },
            # "Surveillance and Monitoring": {
            #     "description": "Tracking and monitoring malaria cases and mosquito populations to inform control strategies.",
            #     "interventions": [
            #         {
            #             "name": "Malaria case surveillance",
            #             "description": "Systematic collection and analysis of malaria case data to guide control efforts.",
            #         },
            #         {
            #             "name": "Entomological monitoring",
            #             "description": "Monitoring mosquito populations to understand transmission dynamics and control efficacy.",
            #         },
            #     ],
            # }
            # Add more categories and interventions with descriptions as necessary
        }

        account = Account.objects.first()
        created_by = User.objects.first()

        for category_name, data in categories_and_interventions.items():
            category, created = InterventionFamily.objects.get_or_create(
                name=category_name,
                defaults={
                    "description": data["description"],
                    "account": account,
                    "created_by": created_by,
                },
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created category: {category_name}"))

            for intervention_data in data["interventions"]:
                intervention, created = Intervention.objects.get_or_create(
                    name=intervention_data["name"],
                    intervention_family=category,
                    defaults={
                        "description": intervention_data["description"],
                        "created_by": created_by,
                    },
                )
                if created:
                    self.stdout.write(self.style.SUCCESS(f"\tCreated intervention: {intervention_data['name']}"))
