from django.urls import path
from . import views
from assessments.page_views import questions_page
urlpatterns = [
    path("",views.dashboard_view,name="dashboard"),
    path("assessment/",questions_page,name="questions_page"),
    path("reports/<int:assessment_id>/",views.report_view,name="report"),
]
