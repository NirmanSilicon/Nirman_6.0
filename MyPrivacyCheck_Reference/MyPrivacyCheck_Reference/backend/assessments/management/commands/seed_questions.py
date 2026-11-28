from django.core.management.base import BaseCommand
from assessments.models import Question

DATA = [
("digital_footprint","Is your email address visible to the public on any profile?","Review public profile visibility.",2),
("digital_footprint","Do public profiles show personal details such as your birthday or education?","Share only details needed for your public profile.",2),
("digital_footprint","Have you shared your phone number publicly?","Avoid displaying personal contact details publicly.",3),
("digital_footprint","Do public posts reveal places you regularly visit?","Consider what public posts reveal.",2),
("digital_footprint","Do you avoid reviewing what personal information is visible on your profiles?","Periodically review public information.",1),
("app_permissions","Have you left app permissions unreviewed?","Review permissions manually in settings.",2),
("app_permissions","Have you noticed an app requesting access unrelated to its main function?","Consider whether access is proportionate to the app's function.",3),
("app_permissions","Do you keep permissions enabled when you no longer need them?","Remove permissions that are no longer needed.",2),
("app_permissions","Do you approve app permissions without understanding why they are needed?","Read permission explanations before approving.",2),
("app_permissions","Do you rarely revisit app permissions?","Review permissions periodically.",1),
("social_media","Are your social media profiles visible to everyone?","Review profile audience settings.",2),
("social_media","Can anyone view your contact information on social media?","Limit contact information visibility.",3),
("social_media","Do you share live location or location details publicly?","Review location-sharing choices.",3),
("social_media","Can people tag you without your review or approval?","Review tagging and mention controls.",1),
("social_media","Do you publish posts without reviewing the audience?","Check the audience selector before posting.",1),
("password_habits","Do you reuse the same password across multiple accounts?","Use unique passwords; never enter them into this assessment.",3),
("password_habits","Do you leave multi-factor authentication disabled when it is available?","Enable multi-factor authentication on important accounts.",2),
("password_habits","Do you use passwords that are easy to guess?","Choose long, unique passwords. Do not share them here.",3),
("password_habits","Do you change a password when you learn an account may be compromised?","Use the service's official recovery process if needed.",2),
("password_habits","Do you share passwords with other people?","Keep account credentials private.",2),
("privacy_practices","Do you skip reviewing privacy settings when creating a new account?","Review privacy settings during account setup.",1),
("privacy_practices","Do you share personal information without reviewing the privacy notice?","Check what information a service says it collects and why.",1),
("privacy_practices","Do you rarely review app and website access you have granted?","Periodically review connected services and permissions.",2),
("privacy_practices","Do you share unnecessary personal information in public posts or comments?","Share only what is appropriate for the audience.",2),
("privacy_practices","Do you enter personal details without checking whether a website or service is legitimate?","Check the service and web address before sharing details.",2),
]

class Command(BaseCommand):
    help = "Load or update the starter question bank."
    def handle(self, *args, **kwargs):
        for category,text,explanation,weight in DATA:
            Question.objects.update_or_create(category=category,text=text,defaults={
                "explanation":explanation,"weight":weight,"active":True
            })
        self.stdout.write(self.style.SUCCESS(f"Loaded {len(DATA)} questions."))
