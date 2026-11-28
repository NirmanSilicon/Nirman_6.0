import json
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST
from django.views.decorators.csrf import ensure_csrf_cookie
from .models import Question, Assessment, Answer, AssessmentResult
from risk_engine.scoring import calculate_assessment

@ensure_csrf_cookie
@require_GET
def questions_api(request):
    rows = Question.objects.filter(active=True).values("id","category","text","explanation","weight")
    return JsonResponse({"questions": list(rows)})

@login_required
@require_POST
def submit_assessment_api(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
        submitted = payload.get("answers", [])
        if not isinstance(submitted, list) or not submitted:
            return JsonResponse({"error":"Submit at least one answer."}, status=400)
        normalized, seen = [], set()
        for item in submitted:
            qid = int(item.get("question_id"))
            response = item.get("response")
            if response not in {"yes","sometimes","no","not_sure"}:
                return JsonResponse({"error":"Invalid response value."}, status=400)
            if qid in seen:
                return JsonResponse({"error":"Duplicate question answer."}, status=400)
            seen.add(qid)
            normalized.append((qid,response))
        qmap = {q.id:q for q in Question.objects.filter(active=True,id__in=seen)}
        if len(qmap) != len(seen):
            return JsonResponse({"error":"One or more questions are unavailable."}, status=400)
        inputs = [{
            "question_id":qid, "category":qmap[qid].category, "response":response,
            "weight":qmap[qid].weight, "question_text":qmap[qid].text
        } for qid,response in normalized]
        result_data = calculate_assessment(inputs)
        with transaction.atomic():
            assessment = Assessment.objects.create(user=request.user, completed=True)
            Answer.objects.bulk_create([
                Answer(assessment=assessment, question=qmap[qid], response=response)
                for qid,response in normalized
            ])
            result = AssessmentResult.objects.create(
                assessment=assessment, overall_score=result_data["overall_score"],
                risk_level=result_data["risk_level"], category_scores=result_data["category_scores"],
                recommendations=result_data["recommendations"], explanation=result_data["explanation"]
            )
        return JsonResponse({
            "assessment_id":assessment.id, "overall_score":result.overall_score,
            "risk_level":result.risk_level, "category_scores":result.category_scores,
            "recommendations":result.recommendations
        }, status=201)
    except (ValueError, TypeError, json.JSONDecodeError):
        return JsonResponse({"error":"Invalid request data."}, status=400)
