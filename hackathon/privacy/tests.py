import json
from django.contrib.auth import get_user_model
from django.core import mail
from django.test import SimpleTestCase, TestCase, override_settings
from types import SimpleNamespace
from .academy import ACADEMY_MODULES, MODULES_BY_SLUG
from .models import AssessmentQuestion, AssessmentResponse, AssessmentResult, LearningAttempt, Recommendation
from .question_bank import seed_questions
from .scoring import calculate_scores, classify_score


class ScoringTests(SimpleTestCase):
    def test_risk_bands_match_product_thresholds(self):
        self.assertEqual(classify_score(80), "Low Risk")
        self.assertEqual(classify_score(79), "Moderate Risk")
        self.assertEqual(classify_score(60), "Moderate Risk")
        self.assertEqual(classify_score(59), "High Risk")
        self.assertEqual(classify_score(40), "High Risk")
        self.assertEqual(classify_score(39), "Critical Risk")

    def test_score_uses_submitted_answers_and_explains_exposure(self):
        category = SimpleNamespace(slug="footprint", name="Digital Footprint", weight=1)
        question = SimpleNamespace(
            pk=1, category=category, weight=1,
            options=[
                {"value": "safe", "risk": 0, "label": "Safe"},
                {"value": "exposed", "risk": 3, "label": "Exposed", "reason": "Public contact details"},
            ],
            prompt="Is your phone public?", explanation="Phone visibility matters.",
            recommendation="Hide your number.",
        )
        safe = calculate_scores([question], {"1": "safe"})
        exposed = calculate_scores([question], {"1": "exposed"})
        self.assertEqual(safe[0], 100)
        self.assertEqual(exposed[0], 0)
        self.assertEqual(exposed[3][0]["explanation"], "Public contact details")
        with self.assertRaises(ValueError):
            calculate_scores([question], {})


class AssessmentFlowTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="demo@example.com", email="demo@example.com", password="SafeDemoPass123!",
        )
        self.client.force_login(self.user)
        seed_questions()

    def test_submit_persists_answer_derived_report_and_recommendations(self):
        questions = list(AssessmentQuestion.objects.all())
        answers = {
            str(question.pk): max(question.options, key=lambda option: option["risk"])["value"]
            for question in questions
        }
        response = self.client.post(
            "/assessment/submit/",
            data=json.dumps(answers),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        result = AssessmentResult.objects.get(user=self.user)
        self.assertEqual(result.score, 0)
        self.assertEqual(AssessmentResponse.objects.filter(result=result).count(), 18)
        self.assertEqual(Recommendation.objects.filter(user=self.user, result=result).count(), 18)
        report_response = self.client.get(response.json()["redirect"])
        self.assertEqual(report_response.status_code, 200)
        self.assertContains(report_response, "No lower-risk answers were recorded")
        pdf_response = self.client.get(response.json()["redirect"] + "download/")
        self.assertEqual(pdf_response["Content-Type"], "application/pdf")
        self.assertTrue(pdf_response.content.startswith(b"%PDF"))

    def test_report_lists_only_practices_supported_by_low_risk_answers(self):
        questions = list(AssessmentQuestion.objects.all())
        answers = {
            str(question.pk): min(question.options, key=lambda option: option["risk"])["value"]
            for question in questions
        }
        response = self.client.post(
            "/assessment/submit/",
            data=json.dumps(answers),
            content_type="application/json",
        )
        report_response = self.client.get(response.json()["redirect"])
        self.assertContains(report_response, "Positive privacy practices")
        self.assertContains(report_response, "Rarely / never")
        self.assertNotContains(report_response, "No lower-risk answers were recorded")

    def test_assessment_page_includes_expected_permission_choices(self):
        response = self.client.get("/assessment/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, '"label": "Allowed"')
        self.assertContains(response, '"label": "Denied"')
        self.assertContains(response, '"label": "Not sure"')

    def test_recommendation_progress_updates_and_results_are_private(self):
        result = AssessmentResult.objects.create(
            user=self.user, score=75, risk_level="Moderate Risk", category_scores={}, findings=[],
        )
        recommendation = Recommendation.objects.create(
            user=self.user, result=result, title="Enable two-factor authentication", detail="Protect your account.",
        )
        for status, display, completed_count, progress in (
            ("pending", "Pending", 0, 0),
            ("in_progress", "In Progress", 0, 0),
            ("completed", "Completed", 1, 100),
        ):
            response = self.client.post(
                f"/recommendations/{recommendation.pk}/",
                data={"status": status},
            )
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json(), {
                "status": display,
                "completed_count": completed_count,
                "pending_count": 1 - completed_count,
                "progress": progress,
            })
            recommendation.refresh_from_db()
            self.assertEqual(recommendation.status, status)
            progress_page = self.client.get("/progress/")
            self.assertContains(progress_page, f'<option value="{status}" selected')

        progress_page = self.client.get("/progress/")
        for status, label in (
            ("pending", "Pending"),
            ("in_progress", "In Progress"),
            ("completed", "Completed"),
        ):
            with self.subTest(status=status):
                self.assertContains(progress_page, f'<option value="{status}"')
                self.assertContains(progress_page, label)

        other_user = get_user_model().objects.create_user(
            username="other@example.com", email="other@example.com", password="SafeDemoPass123!",
        )
        other_result = AssessmentResult.objects.create(
            user=other_user, score=75, risk_level="Moderate Risk", category_scores={}, findings=[],
        )
        self.assertEqual(self.client.get(f"/report/{other_result.pk}/").status_code, 404)
        other_recommendation = Recommendation.objects.create(
            user=other_user, result=other_result, title="Review account privacy", detail="Check your settings.",
        )
        response = self.client.post(
            f"/recommendations/{other_recommendation.pk}/",
            data={"status": "completed"},
        )
        self.assertEqual(response.status_code, 404)
        other_recommendation.refresh_from_db()
        self.assertEqual(other_recommendation.status, "pending")

    def test_registration_validates_email_and_password_and_logs_in(self):
        self.client.logout()
        response = self.client.post("/register/", {
            "name": "New User", "email": "new@example.com",
            "password": "AnotherUniqueDemoPass!73", "confirm_password": "AnotherUniqueDemoPass!73",
        })
        self.assertRedirects(response, "/dashboard/")
        self.assertTrue(get_user_model().objects.filter(email="new@example.com").exists())
        self.client.post("/logout/")
        login_response = self.client.post("/login/", {
            "username": "NEW@EXAMPLE.COM", "password": "AnotherUniqueDemoPass!73",
        })
        self.assertRedirects(login_response, "/dashboard/")

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_password_reset_email_links_to_working_confirmation_page(self):
        response = self.client.post("/forgot-password/", {"email": self.user.email})
        self.assertRedirects(response, "/forgot-password/")
        self.assertEqual(len(mail.outbox), 1)
        reset_path = mail.outbox[0].body.split("http://testserver", 1)[1].split()[0]
        reset_response = self.client.get(reset_path, follow=True)
        self.assertEqual(reset_response.status_code, 200)

    def test_contact_message_is_validated_and_saved(self):
        invalid = self.client.post("/contact/", {"name": "", "email": "not-an-email", "message": ""})
        self.assertEqual(invalid.status_code, 200)
        self.assertContains(invalid, "Please complete each field.")
        valid = self.client.post("/contact/", {
            "name": "Privacy Team", "email": "team@example.com", "message": "Thanks for the useful assessment.",
        })
        self.assertRedirects(valid, "/contact/")
        from .models import ContactMessage
        self.assertEqual(ContactMessage.objects.count(), 1)

    def test_authenticated_pages_render(self):
        for path in ("/dashboard/", "/progress/", "/profile/", "/about/", "/resources/", "/academy/", "/contact/", "/assessment/"):
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 200)

    def test_invalid_assessment_payload_is_rejected(self):
        response = self.client.post(
            "/assessment/submit/",
            data=json.dumps(["not", "an", "answer-map"]),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)


class PrivacyAcademyTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="academy@example.com", email="academy@example.com", password="SafeDemoPass123!",
        )

    def test_modules_and_quizzes_are_open_to_anonymous_visitors(self):
        index = self.client.get("/academy/")
        self.assertEqual(index.status_code, 200)
        self.assertContains(index, "Explore all modules")
        for module in ACADEMY_MODULES:
            response = self.client.get(f"/academy/{module['slug']}/")
            self.assertEqual(response.status_code, 200)
            self.assertContains(response, "Scenario and knowledge check")

        module = MODULES_BY_SLUG["digital-footprint"]
        answers = {
            f"question_{index}": next(choice["value"] for choice in question["choices"] if choice["correct"])
            for index, question in enumerate(module["questions"], 1)
        }
        response = self.client.post(f"/academy/{module['slug']}/", answers)
        self.assertContains(response, "100%")
        self.assertContains(response, "does not update or reduce your Privacy Risk Assessment score")
        self.assertEqual(LearningAttempt.objects.count(), 0)
        self.assertEqual(AssessmentResult.objects.count(), 0)

    def test_recommendations_follow_lowest_assessment_category_scores(self):
        self.client.force_login(self.user)
        result = AssessmentResult.objects.create(
            user=self.user, score=61, risk_level="Moderate Risk",
            category_scores={
                "footprint": {"name": "Digital Footprint", "score": 82, "risk": "Low Risk"},
                "permissions": {"name": "App Permissions", "score": 45, "risk": "High Risk"},
                "social": {"name": "Social Media Privacy", "score": 31, "risk": "Critical Risk"},
            },
            findings=[],
        )

        response = self.client.get("/academy/")
        recommendations = response.context["recommended_modules"]
        self.assertGreater(len(recommendations), 0)
        self.assertEqual(recommendations[0]["focus_score"], 31)
        self.assertIn("social-media-privacy", [item["slug"] for item in recommendations])
        self.assertNotIn("digital-footprint", [item["slug"] for item in recommendations])
        self.assertNotIn("phishing-and-suspicious-links", [item["slug"] for item in recommendations])
        self.assertEqual(result.score, 61)

    def test_authenticated_knowledge_check_is_saved_separately_from_risk(self):
        self.client.force_login(self.user)
        category_scores = {"social": {"name": "Social Media Privacy", "score": 34, "risk": "Critical Risk"}}
        result = AssessmentResult.objects.create(
            user=self.user, score=55, risk_level="High Risk", category_scores=category_scores, findings=[],
        )
        response = self.client.post("/academy/phishing-and-suspicious-links/", {
            "question_1": "click",
            "question_2": "refuse",
        })

        self.assertContains(response, "50%")
        attempt = LearningAttempt.objects.get(user=self.user, module_slug="phishing-and-suspicious-links")
        self.assertEqual(attempt.knowledge_score, 50)
        result.refresh_from_db()
        self.assertEqual(result.score, 55)
        self.assertEqual(result.category_scores, category_scores)

    def test_incomplete_knowledge_check_is_not_saved(self):
        self.client.force_login(self.user)
        response = self.client.post("/academy/app-permissions/", {"question_1": "deny"})
        self.assertContains(response, "Choose an answer for each question")
        self.assertEqual(LearningAttempt.objects.count(), 0)
