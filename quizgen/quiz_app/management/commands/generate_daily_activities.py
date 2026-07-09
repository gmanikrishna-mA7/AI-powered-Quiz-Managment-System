from django.core.management.base import BaseCommand
from quiz_app.services.activity_generator import ActivityGenerator

class Command(BaseCommand):
    help = 'Generates daily activities for Fun & Activities section using AI'

    def handle(self, *args, **kwargs):
        self.stdout.write("Starting activity generation...")
        generator = ActivityGenerator()
        generator.generate_daily_activities()
        self.stdout.write(self.style.SUCCESS("Successfully generated activities!"))
