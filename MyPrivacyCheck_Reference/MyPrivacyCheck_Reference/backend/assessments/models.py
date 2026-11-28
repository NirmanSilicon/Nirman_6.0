from django.conf import settings
from django.db import models

class Question(models.Model):
    CATEGORY_CHOICES = [
        ("digital_footprint","Digital Footprint"), ("app_permissions","Application Permissions"),
        ("social_media","Social Media Privacy"), ("password_habits","Password Habits"),
        ("privacy_practices","Privacy Practices"),
    ]
    category = models.CharField(max_length=40, choices=CATEGORY_CHOICES)
    text = models.CharField(max_length=500)
    explanation = models.CharField(max_length=500, blank=True)
    weight = models.PositiveSmallIntegerField(default=1)
    active = models.BooleanField(default=True)
    order = models.PositiveSmallIntegerField(default=0)
    class Meta:
        ordering = ["category","order","id"]
    def __str__(self):
        return f"{self.get_category_display()}: {self.text[:60]}"

class Assessment(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="assessments")
    created_at = models.DateTimeField(auto_now_add=True)
    completed = models.BooleanField(default=False)
    class Meta:
        ordering = ["-created_at"]

class Answer(models.Model):
    RESPONSE_CHOICES = [("yes","Yes"),("sometimes","Sometimes"),("no","No"),("not_sure","Not sure")]
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey(Question, on_delete=models.PROTECT)
    response = models.CharField(max_length=12, choices=RESPONSE_CHOICES)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["assessment","question"], name="unique_answer_per_question")]

class AssessmentResult(models.Model):
    assessment = models.OneToOneField(Assessment, on_delete=models.CASCADE, related_name="result")
    overall_score = models.PositiveSmallIntegerField()
    risk_level = models.CharField(max_length=20)
    category_scores = models.JSONField(default=dict)
    recommendations = models.JSONField(default=list)
    explanation = models.TextField(blank=True)
