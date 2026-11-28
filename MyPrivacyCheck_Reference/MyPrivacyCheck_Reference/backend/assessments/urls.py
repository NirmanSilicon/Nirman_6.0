from django.urls import path
from . import views
urlpatterns = [
    path("questions/", views.questions_api, name="questions_api"),
    path("assessments/submit/", views.submit_assessment_api, name="submit_assessment_api"),
]
