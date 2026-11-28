from django.contrib import admin
from .models import Question, Assessment, Answer, AssessmentResult
admin.site.register(Question)
admin.site.register(Assessment)
admin.site.register(Answer)
admin.site.register(AssessmentResult)
