from django.contrib.auth.decorators import login_required
from django.shortcuts import render
@login_required
def questions_page(request):
    return render(request, "assessments/questions.html")
