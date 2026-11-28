from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.http import Http404
from assessments.models import Assessment

@login_required
def dashboard_view(request):
    history = Assessment.objects.filter(user=request.user,completed=True).select_related("result").order_by("-created_at")
    return render(request,"reports/dashboard.html",{
        "latest":history.first(),"history":history[:10],"assessment_count":history.count()
    })

@login_required
def report_view(request, assessment_id):
    assessment = Assessment.objects.filter(id=assessment_id,user=request.user,completed=True).select_related("result").first()
    if assessment is None:
        raise Http404("Report not found.")
    return render(request,"reports/report.html",{"assessment":assessment})
