from django.conf import settings
from django.db import models


class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="privacy_profile")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Profile for {self.user.username}"


class RiskCategory(models.Model):
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=80)
    description = models.CharField(max_length=240)
    weight = models.PositiveSmallIntegerField(default=1)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.name


class AssessmentQuestion(models.Model):
    category = models.ForeignKey(RiskCategory, on_delete=models.CASCADE, related_name="questions")
    prompt = models.CharField(max_length=240)
    explanation = models.CharField(max_length=360)
    options = models.JSONField(default=list)
    recommendation = models.CharField(max_length=240)
    weight = models.PositiveSmallIntegerField(default=1)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["category_id", "order"]
        constraints = [
            models.UniqueConstraint(fields=["category", "order"], name="unique_category_question_order"),
        ]

    def __str__(self):
        return self.prompt


class AssessmentResult(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="assessment_results")
    score = models.PositiveSmallIntegerField()
    risk_level = models.CharField(max_length=20)
    category_scores = models.JSONField(default=dict)
    findings = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class AssessmentResponse(models.Model):
    result = models.ForeignKey(AssessmentResult, on_delete=models.CASCADE, related_name="responses")
    question = models.ForeignKey(AssessmentQuestion, on_delete=models.PROTECT)
    answer = models.CharField(max_length=30)
    risk_points = models.PositiveSmallIntegerField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["result", "question"], name="unique_result_question"),
        ]


class Recommendation(models.Model):
    STATUS_CHOICES = [("pending", "Pending"), ("in_progress", "In Progress"), ("completed", "Completed")]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="recommendations")
    result = models.ForeignKey(AssessmentResult, on_delete=models.CASCADE, related_name="recommendations")
    title = models.CharField(max_length=240)
    detail = models.CharField(max_length=360)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["status", "id"]


class LearningAttempt(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="learning_attempts")
    module_slug = models.SlugField(max_length=80)
    knowledge_score = models.PositiveSmallIntegerField()
    correct_answers = models.PositiveSmallIntegerField()
    question_count = models.PositiveSmallIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class ContactMessage(models.Model):
    name = models.CharField(max_length=120)
    email = models.EmailField()
    message = models.CharField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Contact from {self.name}"
