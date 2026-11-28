from django.contrib.auth import views as auth_views
from django.urls import reverse_lazy
from django.urls import path
from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("about/", views.about, name="about"),
    path("resources/", views.resources, name="resources"),
    path("academy/", views.academy, name="academy"),
    path("academy/<slug:module_slug>/", views.academy_module, name="academy-module"),
    path("contact/", views.contact, name="contact"),
    path("register/", views.register, name="register"),
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("forgot-password/", views.forgot_password, name="forgot-password"),
    path("password-reset/done/", auth_views.PasswordResetDoneView.as_view(template_name="privacy/password_reset_done.html"), name="password_reset_done"),
    path("password-reset/<uidb64>/<token>/", auth_views.PasswordResetConfirmView.as_view(
        template_name="privacy/password_reset_confirm.html",
        success_url=reverse_lazy("password_reset_complete"),
    ), name="password_reset_confirm"),
    path("password-reset/complete/", auth_views.PasswordResetCompleteView.as_view(
        template_name="privacy/password_reset_complete.html",
    ), name="password_reset_complete"),
    path("dashboard/", views.dashboard, name="dashboard"),
    path("assessment/", views.assessment, name="assessment"),
    path("assessment/submit/", views.submit_assessment, name="submit-assessment"),
    path("report/<int:result_id>/", views.report, name="report"),
    path("report/<int:result_id>/download/", views.download_report, name="download-report"),
    path("progress/", views.progress, name="progress"),
    path("recommendations/<int:recommendation_id>/", views.update_recommendation, name="update-recommendation"),
    path("profile/", views.profile, name="profile"),
    path("secure-admin/", views.admin_dashboard, name="admin-dashboard"),
]
