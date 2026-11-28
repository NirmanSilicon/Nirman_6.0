from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model

class AccountTests(TestCase):
    def test_register_page(self):
        self.assertEqual(self.client.get(reverse("register")).status_code, 200)
    def test_dashboard_requires_login(self):
        self.assertEqual(self.client.get(reverse("dashboard")).status_code, 302)
    def test_registration_creates_user(self):
        response = self.client.post(reverse("register"), {
            "username":"sampleuser", "email":"sample@example.com", "full_name":"Sample User",
            "password1":"A-Strong-Test-Password-93!", "password2":"A-Strong-Test-Password-93!"
        })
        self.assertEqual(response.status_code, 302)
        self.assertTrue(get_user_model().objects.filter(username="sampleuser").exists())
