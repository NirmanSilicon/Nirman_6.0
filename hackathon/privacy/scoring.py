"""Transparent, deterministic scoring for self-reported privacy habits."""


def classify_score(score):
    if score >= 80:
        return "Low Risk"
    if score >= 60:
        return "Moderate Risk"
    if score >= 40:
        return "High Risk"
    return "Critical Risk"


def calculate_scores(questions, submitted):
    """Return scores and findings for question-id -> option-key responses."""
    category_risks = {}
    category_max = {}
    findings = []
    normalized_answers = []

    for question in questions:
        answer = submitted.get(str(question.pk))
        options = {str(item["value"]): item for item in question.options}
        if answer not in options:
            raise ValueError(f"Missing or invalid response for question {question.pk}.")
        option = options[answer]
        points = int(option["risk"])
        key = question.category.slug
        category_risks[key] = category_risks.get(key, 0) + points * question.weight
        category_max[key] = category_max.get(key, 0) + 3 * question.weight
        normalized_answers.append((question, answer, points))
        if points:
            findings.append({
                "category": question.category.name,
                "title": question.prompt,
                "explanation": option.get("reason", question.explanation),
                "action": question.recommendation,
            })

    category_scores = {}
    weighted_score = 0
    total_weight = 0
    categories = {}
    for question in questions:
        categories[question.category.slug] = question.category
    for key, risk in category_risks.items():
        score = round(100 * (1 - risk / category_max[key]))
        category_scores[key] = {
            "name": categories[key].name,
            "score": max(0, min(100, score)),
            "risk": classify_score(max(0, min(100, score))),
        }
        weighted_score += score * categories[key].weight
        total_weight += categories[key].weight
    overall = round(weighted_score / total_weight) if total_weight else 0
    return overall, classify_score(overall), category_scores, findings, normalized_answers
