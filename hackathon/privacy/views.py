import json

from django.contrib import messages
from django.contrib.auth import get_user_model, login, logout
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.forms import AuthenticationForm, PasswordResetForm
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.utils.http import url_has_allowed_host_and_scheme
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from .academy import ACADEMY_MODULES, MODULES_BY_SLUG, recommended_modules_for
from .models import AssessmentQuestion, AssessmentResponse, AssessmentResult, ContactMessage, LearningAttempt, Profile, Recommendation
from .question_bank import seed_questions
from .scoring import calculate_scores

User = get_user_model()


def ensure_questions():
    if not AssessmentQuestion.objects.exists():
        seed_questions()


def home(request):
    return render(request, "privacy/home.html")


def about(request):
    return render(request, "privacy/about.html")


def resources(request):
    return render(request, "privacy/resources.html")


def academy(request):
    latest_result = request.user.assessment_results.first() if request.user.is_authenticated else None
    latest_attempts = {}
    if request.user.is_authenticated:
        for attempt in LearningAttempt.objects.filter(user=request.user):
            latest_attempts.setdefault(attempt.module_slug, attempt)

    modules = []
    for module in ACADEMY_MODULES:
        item = dict(module)
        item["latest_attempt"] = latest_attempts.get(module["slug"])
        modules.append(item)

    return render(request, "privacy/academy.html", {
        "modules": modules,
        "recommended_modules": recommended_modules_for(latest_result),
        "latest_result": latest_result,
        "completed_module_count": len(latest_attempts),
    })


def academy_module(request, module_slug):
    module = MODULES_BY_SLUG.get(module_slug)
    if module is None:
        from django.http import Http404
        raise Http404("Learning module not found.")

    submitted_answers = {}
    quiz_result = None
    form_error = ""
    if request.method == "POST":
        valid_answers = True
        correct_answers = 0
        for index, question in enumerate(module["questions"], 1):
            question_key = f"question_{index}"
            answer = request.POST.get(question_key, "")
            choice = next((choice for choice in question["choices"] if choice["value"] == answer), None)
            if choice is None:
                valid_answers = False
                continue
            submitted_answers[question_key] = answer
            if choice["correct"]:
                correct_answers += 1

        if not valid_answers or len(submitted_answers) != len(module["questions"]):
            form_error = "Choose an answer for each question."
        else:
            question_count = len(module["questions"])
            knowledge_score = round(100 * correct_answers / question_count)
            quiz_result = {
                "knowledge_score": knowledge_score,
                "correct_answers": correct_answers,
                "question_count": question_count,
            }
            if request.user.is_authenticated:
                LearningAttempt.objects.create(
                    user=request.user,
                    module_slug=module["slug"],
                    knowledge_score=knowledge_score,
                    correct_answers=correct_answers,
                    question_count=question_count,
                )

    questions = []
    for index, question in enumerate(module["questions"], 1):
        question_item = dict(question)
        question_item["choices"] = []
        for choice in question["choices"]:
            choice_item = dict(choice)
            choice_item["selected"] = submitted_answers.get(f"question_{index}") == choice["value"]
            if choice_item["selected"] and quiz_result:
                question_item["feedback"] = choice["feedback"]
                question_item["answered_correctly"] = choice["correct"]
            question_item["choices"].append(choice_item)
        questions.append(question_item)

    display_module = dict(module)
    display_module["questions"] = questions
    previous_attempt = None
    if request.user.is_authenticated:
        previous_attempt = LearningAttempt.objects.filter(
            user=request.user, module_slug=module["slug"],
        ).first()

    return render(request, "privacy/academy_module.html", {
        "module": display_module,
        "submitted_answers": submitted_answers,
        "quiz_result": quiz_result,
        "form_error": form_error,
        "previous_attempt": previous_attempt,
    })


def contact(request):
    if request.method == "POST":
        name = request.POST.get("name", "").strip()
        email = request.POST.get("email", "").strip()
        message = request.POST.get("message", "").strip()
        error = ""
        if not name or not message:
            error = "Please complete each field."
        elif len(name) > 120 or len(email) > 254 or len(message) > 2000:
            error = "Please keep your name under 120 characters and message under 2,000 characters."
        else:
            try:
                validate_email(email)
            except ValidationError:
                error = "Enter a valid email address."
        if error:
            return render(request, "privacy/contact.html", {"error": error})
        ContactMessage.objects.create(name=name, email=email, message=message)
        messages.success(request, "Thanks for reaching out. Your message has been received.")
        return redirect("contact")
    return render(request, "privacy/contact.html")


def register(request):
    if request.user.is_authenticated:
        return redirect("dashboard")
    error = ""
    if request.method == "POST":
        name = request.POST.get("name", "").strip()
        email = request.POST.get("email", "").strip().lower()
        password = request.POST.get("password", "")
        confirm = request.POST.get("confirm_password", "")
        if not name or not email or not password:
            error = "Please complete all fields."
        elif password != confirm:
            error = "Passwords do not match."
        elif len(email) > 150:
            error = "Use an email address under 150 characters."
        elif User.objects.filter(email__iexact=email).exists() or User.objects.filter(username__iexact=email).exists():
            error = "An account with this email already exists."
        else:
            candidate = User(username=email, email=email, first_name=name[:150])
            try:
                validate_email(email)
                validate_password(password, candidate)
            except ValidationError as exc:
                error = " ".join(exc.messages)
            if not error:
                candidate.set_password(password)
                candidate.save()
                Profile.objects.create(user=candidate)
                login(request, candidate)
                messages.success(request, "Your account is ready. Let's check your privacy baseline.")
                return redirect("dashboard")
    return render(request, "privacy/register.html", {"error": error})


def login_view(request):
    if request.user.is_authenticated:
        return redirect("dashboard")
    form = AuthenticationForm(request, data=request.POST or None)
    if request.method == "POST" and form.is_valid():
        login(request, form.get_user())
        destination = request.POST.get("next") or request.GET.get("next", "")
        if destination and url_has_allowed_host_and_scheme(destination, allowed_hosts={request.get_host()}, require_https=request.is_secure()):
            return redirect(destination)
        return redirect("dashboard")
    return render(request, "privacy/login.html", {"form": form})


@require_POST
def logout_view(request):
    logout(request)
    return redirect("home")


def forgot_password(request):
    form = PasswordResetForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        # Email delivery is configured by the deployment; do not reveal whether an account exists.
        form.save(request=request, use_https=request.is_secure(), email_template_name="registration/password_reset_email.html")
        messages.success(request, "If an account matches that email, reset instructions will be sent.")
        return redirect("forgot-password")
    return render(request, "privacy/forgot_password.html", {"form": form})


@login_required
def dashboard(request):
    latest = request.user.assessment_results.first()
    history = request.user.assessment_results.all()[:5]
    recommended_modules = recommended_modules_for(latest)
    recommendations = request.user.recommendations.all()
    total = recommendations.count()
    completed = recommendations.filter(status="completed").count()
    assessment_count = request.user.assessment_results.count()
    return render(request, "privacy/dashboard.html", {
        "latest": latest, "history": history, "completed_count": completed,
        "academy_recommendations": recommended_modules[:3],
        "assessment_count": assessment_count,
        "pending_assessments": 0 if assessment_count else 3,
        "pending_count": total - completed,
        "progress": round(100 * completed / total) if total else 0,
    })


@login_required
def assessment(request):
    ensure_questions()
    categories = []
    for category in AssessmentQuestion.objects.select_related("category").order_by("category__id").values_list("category", flat=True).distinct():
        question_category = AssessmentQuestion.objects.filter(category_id=category).first().category
        categories.append({
            "id": question_category.slug, "name": question_category.name,
            "description": question_category.description,
            "questions": list(AssessmentQuestion.objects.filter(category=question_category).values(
                "id", "prompt", "explanation", "options"
            )),
        })
    return render(request, "privacy/assessment.html", {"categories": categories})


@login_required
@require_POST
def submit_assessment(request):
    ensure_questions()
    try:
        submitted = json.loads(request.body.decode("utf-8"))
        if not isinstance(submitted, dict):
            raise ValueError("Assessment responses must be an object.")
        questions = list(AssessmentQuestion.objects.select_related("category").all())
        score, level, category_scores, findings, answers = calculate_scores(questions, submitted)
    except (ValueError, TypeError, UnicodeDecodeError) as exc:
        return JsonResponse({"error": str(exc)}, status=400)

    result = AssessmentResult.objects.create(
        user=request.user, score=score, risk_level=level,
        category_scores=category_scores, findings=findings,
    )
    AssessmentResponse.objects.bulk_create([
        AssessmentResponse(result=result, question=question, answer=answer, risk_points=points)
        for question, answer, points in answers
    ])
    Recommendation.objects.bulk_create([
        Recommendation(user=request.user, result=result, title=finding["action"], detail=finding["explanation"])
        for finding in findings
    ])
    return JsonResponse({"redirect": f"/report/{result.pk}/"})


@login_required
def report(request, result_id):
    result = get_object_or_404(AssessmentResult, pk=result_id, user=request.user)
    positive_practices = []
    for response in result.responses.select_related("question__category"):
        if response.risk_points == 0:
            answer = next(
                (option for option in response.question.options if str(option["value"]) == response.answer),
                None,
            )
            if answer:
                positive_practices.append({
                    "category": response.question.category.name,
                    "question": response.question.prompt,
                    "answer": answer["label"],
                })
    return render(request, "privacy/report.html", {
        "result": result,
        "positive_practices": positive_practices,
    })


@login_required
def download_report(request, result_id):
    from io import BytesIO
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas

    result = get_object_or_404(AssessmentResult, pk=result_id, user=request.user)
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    _, page_height = letter
    y = page_height - 54
    pdf.setTitle("MyPrivacyCheck assessment report")
    pdf.setFont("Helvetica-Bold", 17)
    pdf.drawString(48, y, "MyPrivacyCheck — Privacy Report")
    y -= 28
    pdf.setFont("Helvetica", 10)
    rows = [
        f"Created: {result.created_at:%Y-%m-%d %H:%M UTC}",
        f"Privacy score: {result.score}/100 ({result.risk_level})",
        "", "Category scores:",
    ]
    rows.extend(f"- {item['name']}: {item['score']}/100 ({item['risk']})" for item in result.category_scores.values())
    rows.extend(["", "Identified risks and suggested actions:"])
    for item in result.findings:
        rows.extend([f"- {item['title']}: {item['explanation']}", f"  Action: {item['action']}"])
    rows.extend(["", "Educational score based on self-reported answers; not a guarantee of security."])
    for row in rows:
        # Wrap longer explanations to keep all text within the printable page area.
        import textwrap
        for line in textwrap.wrap(row, width=92) or [""]:
            if y < 54:
                pdf.showPage()
                pdf.setFont("Helvetica", 10)
                y = page_height - 54
            pdf.drawString(48, y, line.encode("latin-1", "replace").decode("latin-1"))
            y -= 15
    pdf.save()
    response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="myprivacycheck-report-{result.pk}.pdf"'
    return response


@login_required
def progress(request):
    results = request.user.assessment_results.all()
    recommendations = request.user.recommendations.all()
    total = recommendations.count()
    completed = recommendations.filter(status="completed").count()
    return render(request, "privacy/progress.html", {
        "results": results[:10], "recommendations": recommendations[:30],
        "completed_count": completed, "pending_count": total - completed,
        "progress": round(100 * completed / total) if total else 0,
    })


@login_required
@require_POST
def update_recommendation(request, recommendation_id):
    recommendation = get_object_or_404(Recommendation, pk=recommendation_id, user=request.user)
    status = request.POST.get("status")
    if status not in dict(Recommendation.STATUS_CHOICES):
        return JsonResponse({"error": "Choose a valid recommendation status."}, status=400)
    recommendation.status = status
    recommendation.save(update_fields=["status", "updated_at"])
    total = request.user.recommendations.count()
    completed = request.user.recommendations.filter(status="completed").count()
    return JsonResponse({
        "status": recommendation.get_status_display(),
        "completed_count": completed,
        "pending_count": total - completed,
        "progress": round(100 * completed / total) if total else 0,
    })


@login_required
def profile(request):
    if request.method == "POST":
        name = request.POST.get("name", "").strip()
        if not name:
            messages.error(request, "Name cannot be blank.")
        else:
            request.user.first_name = name[:150]
            request.user.save(update_fields=["first_name"])
            messages.success(request, "Profile updated.")
            return redirect("profile")
    return render(request, "privacy/profile.html")


@user_passes_test(lambda user: user.is_staff, login_url="login")
def admin_dashboard(request):
    from django.db.models import Avg, Count
    results = AssessmentResult.objects.all()
    risk_stats = results.values("risk_level").annotate(count=Count("id"))
    return render(request, "privacy/admin_dashboard.html", {
        "user_count": User.objects.count(), "assessment_count": results.count(),
        "average_score": round(results.aggregate(avg=Avg("score"))["avg"] or 0),
        "risk_stats": risk_stats,
    })
