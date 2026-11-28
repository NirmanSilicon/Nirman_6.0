LABELS = {
    "digital_footprint":"Digital Footprint", "app_permissions":"Application Permissions",
    "social_media":"Social Media Privacy", "password_habits":"Password Habits",
    "privacy_practices":"Privacy Practices",
}
RESPONSE_RISK = {"yes":1.0, "sometimes":0.5, "no":0.0, "not_sure":0.5}

def risk_band(score):
    if score < 34: return "Low"
    if score < 67: return "Moderate"
    return "High"

def recommendation_for(category, score):
    if score < 34: return None
    tips = {
        "digital_footprint":"Review public profiles and limit unnecessary exposure of contact and personal details.",
        "app_permissions":"Manually review app permissions and remove access that is not needed for the app's function.",
        "social_media":"Review profile, post audience, contact visibility, tagging and location-sharing settings.",
        "password_habits":"Use unique passwords, avoid sharing credentials and enable multi-factor authentication where available. Never submit passwords here.",
        "privacy_practices":"Review privacy settings and notices before sharing personal information.",
    }
    return tips.get(category, "Review this area and consider reducing unnecessary exposure.")

def calculate_assessment(answers):
    # Weighted average of the answers supplied; not a breach probability.
    totals, maxima = {}, {}
    for answer in answers:
        category = answer["category"]
        weight = max(1, int(answer.get("weight", 1)))
        risk = RESPONSE_RISK[answer["response"]]
        totals[category] = totals.get(category, 0.0) + risk * weight
        maxima[category] = maxima.get(category, 0.0) + weight
    if not totals:
        raise ValueError("At least one answer is required.")
    categories = {}
    for category,total in totals.items():
        score = round(total / maxima[category] * 100)
        categories[category] = {
            "label":LABELS.get(category, category.replace("_"," ").title()),
            "score":score, "risk_level":risk_band(score)
        }
    overall = round(sum(x["score"] for x in categories.values()) / len(categories))
    recs = []
    for category,item in categories.items():
        tip = recommendation_for(category,item["score"])
        if tip:
            recs.append({"category":item["label"],"priority":item["risk_level"],"text":tip})
    return {
        "overall_score":overall, "risk_level":risk_band(overall),
        "category_scores":categories, "recommendations":recs,
        "explanation":"This indicative score uses only the answers you supplied. It is not a probability of a breach or a guarantee of safety."
    }
