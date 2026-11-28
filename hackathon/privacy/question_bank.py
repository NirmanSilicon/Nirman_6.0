CATEGORIES = [
    {
        "slug": "footprint", "name": "Digital Footprint", "weight": 3,
        "description": "Understand what your everyday online presence reveals.",
        "questions": [
            ("How often do you share personal details (such as your birthday or school) publicly?", "Small details can be combined to identify or impersonate you.", "Limit personal details visible to people you do not know.", [("rarely", "Rarely / never", 0), ("sometimes", "Sometimes", 1), ("often", "Often", 3)]),
            ("Is your email address or phone number visible on a public profile?", "Public contact details can invite spam, scams, and account-recovery attacks.", "Remove contact details from public profile pages.", [("no", "No", 0), ("unsure", "Not sure", 1), ("yes", "Yes", 3)]),
            ("Do you share your live location or regular whereabouts publicly?", "Real-time location can reveal where you are and when you are away.", "Turn off public location sharing and review check-ins.", [("never", "Never", 0), ("sometimes", "Sometimes", 2), ("often", "Often", 3)]),
            ("Are your main public profiles limited to people you know?", "Public profiles can expose posts and personal information to anyone.", "Review profile visibility and choose an audience intentionally.", [("private", "Yes, audience is limited", 0), ("mixed", "Some are public", 2), ("public", "Most are public", 3)]),
            ("Do you reuse passwords across multiple online accounts?", "A breach on one service can put every account using that password at risk.", "Use unique passwords; a password manager can help.", [("never", "Never", 0), ("few", "For a few accounts", 2), ("often", "Often", 3)]),
            ("Do you use two-factor authentication on important accounts?", "A second sign-in step helps protect accounts if a password is exposed.", "Enable two-factor authentication on email and financial accounts.", [("yes", "Yes, on most important accounts", 0), ("some", "On some accounts", 1), ("no", "No / not sure", 3)]),
        ],
    },
    {
        "slug": "permissions", "name": "App Permissions", "weight": 2,
        "description": "Check whether apps request more access than they need.",
        "questions": [
            ("Do apps have camera permission when you do not need a camera feature?", "Camera access should be limited to apps that need it for a feature you use.", "Revoke camera access from apps that do not need it.", [("allowed", "Allowed", 3), ("denied", "Denied", 0), ("unsure", "Not sure", 1)]),
            ("Do apps have microphone permission when you do not need an audio feature?", "Microphone access may expose audio when an app feature uses it.", "Keep microphone permission off unless an app needs it.", [("allowed", "Allowed", 3), ("denied", "Denied", 0), ("unsure", "Not sure", 1)]),
            ("Do apps have access to your precise location when they do not need it?", "Location data can reveal routines and sensitive places you visit.", "Prefer 'while using' or approximate location where available.", [("allowed", "Allowed", 3), ("denied", "Denied", 0), ("unsure", "Not sure", 1)]),
            ("Do apps have access to your contacts without a clear need?", "Contact access can expose information about people in your address book.", "Remove contact access when it is not essential to the app.", [("allowed", "Allowed", 3), ("denied", "Denied", 0), ("unsure", "Not sure", 1)]),
            ("Do apps have broad photo or media access when selected items would be enough?", "Broad media access can reveal personal images and documents.", "Choose selected-photo access or revoke unused permissions.", [("allowed", "Allowed", 3), ("denied", "Denied", 0), ("unsure", "Not sure", 1)]),
            ("Do apps you no longer use still have permissions enabled?", "Unused apps may retain access you no longer intend to grant.", "Uninstall unused apps and review their permissions.", [("allowed", "Allowed", 3), ("denied", "Denied", 0), ("unsure", "Not sure", 1)]),
        ],
    },
    {
        "slug": "social", "name": "Social Media Privacy", "weight": 2,
        "description": "Review visibility, account security, and connected services.",
        "questions": [
            ("Are your social media accounts private or audience-limited?", "Public posts can be copied, indexed, and seen beyond your intended audience.", "Set an audience that matches your comfort level.", [("yes", "Yes, most are limited", 0), ("some", "Some are public", 2), ("no", "Most are public", 3)]),
            ("Do you periodically review followers or connections you do not recognize?", "Unknown followers can see content intended for your social circle.", "Review followers and remove accounts you do not trust.", [("yes", "Yes, regularly", 0), ("sometimes", "Sometimes", 1), ("no", "No", 3)]),
            ("Do you use two-factor authentication on social accounts?", "A second factor reduces the chance of an account takeover.", "Enable two-factor authentication in account security settings.", [("yes", "Yes, on most accounts", 0), ("some", "On some accounts", 1), ("no", "No / not sure", 3)]),
            ("Do you share sensitive personal details in posts or profile bios?", "Public personal details can help scammers guess security answers or target you.", "Remove sensitive details from bios and older public posts.", [("rarely", "Rarely / never", 0), ("sometimes", "Sometimes", 2), ("often", "Often", 3)]),
            ("Do your posts or photos include location tags by default?", "Location tags can reveal home, school, or travel patterns.", "Disable automatic location tagging and review old posts.", [("off", "No, location tags are off", 0), ("sometimes", "Sometimes", 2), ("on", "Yes / not sure", 3)]),
            ("Have you reviewed third-party apps connected to your social accounts?", "Connected services may retain access to profile data after you stop using them.", "Remove connected apps you no longer recognize or use.", [("yes", "Yes, recently", 0), ("unsure", "Not sure", 1), ("no", "No, never", 3)]),
        ],
    },
]


def seed_questions():
    from .models import AssessmentQuestion, RiskCategory

    for category_data in CATEGORIES:
        category, _ = RiskCategory.objects.update_or_create(
            slug=category_data["slug"],
            defaults={"name": category_data["name"], "description": category_data["description"], "weight": category_data["weight"]},
        )
        for order, (prompt, explanation, recommendation, options) in enumerate(category_data["questions"], 1):
            option_data = [
                {"value": value, "label": label, "risk": risk,
                 "reason": f"This response indicates a privacy exposure. {explanation}" if risk else ""}
                for value, label, risk in options
            ]
            AssessmentQuestion.objects.update_or_create(
                category=category, order=order,
                defaults={
                    "prompt": prompt, "explanation": explanation,
                    "recommendation": recommendation, "options": option_data, "weight": 1,
                },
            )
