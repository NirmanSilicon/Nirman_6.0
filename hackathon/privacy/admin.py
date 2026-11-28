from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin
from .models import AssessmentQuestion, ContactMessage, Profile, RiskCategory

admin.site.unregister(get_user_model())
admin.site.register(get_user_model(), UserAdmin)
admin.site.register(Profile)
admin.site.register(RiskCategory)
admin.site.register(AssessmentQuestion)
@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "created_at")
    readonly_fields = ("name", "email", "message", "created_at")
    search_fields = ("name", "email")
