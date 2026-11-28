from .scoring import recommendation_for

def generate_recommendations(category_scores):
    result = []
    for category, details in category_scores.items():
        text = recommendation_for(category, details.get("score", 0))
        if text:
            result.append({"category":details.get("label",category),
                           "priority":details.get("risk_level","Review"),"text":text})
    return result
