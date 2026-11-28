ACADEMY_MODULES = [
    {
        "slug": "digital-footprint",
        "title": "Digital Footprint",
        "category_slugs": ("footprint",),
        "summary": "Understand how small details, public profiles, and account habits add up over time.",
        "minutes": 4,
        "intro": "Information shared across profiles and posts can be copied, searched, and combined. A quick review helps you decide what should stay public.",
        "learn": [
            "Share only the personal details needed for a service.",
            "Review older public posts and profile fields, not just new content.",
            "Use unique passwords and two-factor authentication on important accounts.",
        ],
        "questions": [
            {
                "prompt": "You are about to post a photo from school. Your name badge and live location are visible. What is the safest next step?",
                "choices": [
                    {"value": "post", "label": "Post it now; only friends will probably see it.", "correct": False, "feedback": "A post can travel beyond its intended audience. Check the image for identifying details and remove the location before sharing."},
                    {"value": "review", "label": "Remove identifying details and location, then choose a limited audience.", "correct": True, "feedback": "Correct. Removing details and choosing an intentional audience reduces what the post reveals."},
                    {"value": "tag", "label": "Add the school name so people know where the photo was taken.", "correct": False, "feedback": "Adding a place can reveal a routine or current location. Avoid unnecessary location details."},
                ],
            },
            {
                "prompt": "Which is a useful first step when reviewing your digital footprint?",
                "choices": [
                    {"value": "audit", "label": "Check profile visibility, contact details, and older public posts.", "correct": True, "feedback": "Correct. Reviewing what is already public helps you make informed choices about what to keep or remove."},
                    {"value": "share", "label": "Share more personal details so your profiles look complete.", "correct": False, "feedback": "More detail is not always helpful. Only include information that is necessary and that you are comfortable making visible."},
                    {"value": "reuse", "label": "Use the same password so all accounts are easier to remember.", "correct": False, "feedback": "Password reuse can put multiple accounts at risk if one service is breached. Use unique passwords."},
                ],
            },
        ],
    },
    {
        "slug": "app-permissions",
        "title": "App Permissions",
        "category_slugs": ("permissions",),
        "summary": "Make informed choices about an app's access to location, camera, microphone, contacts, and media.",
        "minutes": 4,
        "intro": "Permissions let apps use device features or information. Access should match a feature you need, and many devices let you change it later.",
        "learn": [
            "Ask whether a permission is needed for the feature you are using.",
            "Prefer one-time, approximate, or while-in-use access when it meets your needs.",
            "Review and remove access for apps you no longer use.",
        ],
        "questions": [
            {
                "prompt": "A simple flashlight app asks for access to your contacts and microphone. What should you do?",
                "choices": [
                    {"value": "allow", "label": "Allow both so the app works as intended.", "correct": False, "feedback": "Those permissions do not appear necessary for a flashlight feature. Deny them and consider choosing a more trustworthy app."},
                    {"value": "deny", "label": "Deny access and review whether the app needs those permissions at all.", "correct": True, "feedback": "Correct. Limit access to what is needed for the feature, and review apps that request unrelated permissions."},
                    {"value": "ignore", "label": "Ignore the request and leave the permissions enabled indefinitely.", "correct": False, "feedback": "It is worth checking what access is granted. You can usually review and change permissions in your device settings."},
                ],
            },
            {
                "prompt": "A map app needs your location for turn-by-turn directions. Which choice is usually the most limited?",
                "choices": [
                    {"value": "always", "label": "Allow location access all the time, even when the app is closed.", "correct": False, "feedback": "Always-on access may be broader than needed for directions. Check whether a more limited setting works."},
                    {"value": "while", "label": "Allow location while using the app, if that supports the feature.", "correct": True, "feedback": "Correct. Use the narrowest permission that still supports the feature you want."},
                    {"value": "contacts", "label": "Allow contacts access instead of location.", "correct": False, "feedback": "Contacts access is unrelated to turn-by-turn directions. Permissions should match the feature being used."},
                ],
            },
        ],
    },
    {
        "slug": "social-media-privacy",
        "title": "Social Media Privacy",
        "category_slugs": ("social",),
        "summary": "Review who can see your posts, profile details, location tags, and connected services.",
        "minutes": 4,
        "intro": "Social platforms offer audience and discovery controls, but defaults vary. Review them periodically and choose settings that match what you want to share.",
        "learn": [
            "Check the audience for posts, profile details, and follower lists.",
            "Turn off automatic location tagging when you do not need it.",
            "Review followers and connected apps you no longer recognize or use.",
        ],
        "questions": [
            {
                "prompt": "A photo app automatically adds your location to every post. What is a privacy-conscious response?",
                "choices": [
                    {"value": "keep", "label": "Leave it on; location tags make every post more useful.", "correct": False, "feedback": "Location tags can reveal routines and places you visit. Keep them off unless you have a clear reason to share."},
                    {"value": "disable", "label": "Disable automatic tagging and review the audience before posting.", "correct": True, "feedback": "Correct. Disabling automatic tags and checking the audience gives you more control over location sharing."},
                    {"value": "public", "label": "Make the account public so followers can see the location.", "correct": False, "feedback": "A public audience can expose posts to people you do not know. Choose the audience intentionally."},
                ],
            },
            {
                "prompt": "You find an old third-party app connected to your social account that you no longer use. What should you do?",
                "choices": [
                    {"value": "leave", "label": "Leave it connected in case you use it again.", "correct": False, "feedback": "Unused services may retain access. Review the connection and revoke it if you no longer need or recognize it."},
                    {"value": "remove", "label": "Revoke its access, then review the account's other connected apps.", "correct": True, "feedback": "Correct. Removing unused connections limits ongoing access to your account information."},
                    {"value": "password", "label": "Send the app your password again to check that it is legitimate.", "correct": False, "feedback": "Do not share your password with a third-party app. Use the platform's connected-app settings to manage access."},
                ],
            },
        ],
    },
    {
        "slug": "phishing-and-suspicious-links",
        "title": "Phishing and Suspicious Links",
        "category_slugs": (),
        "summary": "Pause, verify, and choose a safer route when a message pressures you to click or sign in.",
        "minutes": 5,
        "intro": "Unexpected messages may imitate people or services you know. Urgent language and links are reasons to verify independently before taking action.",
        "learn": [
            "Treat unexpected requests for passwords, codes, or payment with caution.",
            "Check requests through a known app, website, or contact method instead of the message link.",
            "Never share one-time sign-in codes with someone who contacts you.",
        ],
        "questions": [
            {
                "prompt": "You receive an unexpected message saying your account will be closed in ten minutes unless you sign in through its link. What do you do?",
                "choices": [
                    {"value": "click", "label": "Click quickly so you do not lose access.", "correct": False, "feedback": "Urgency can pressure you into a mistake. Do not use the unexpected link; open the service through its official app or a saved address."},
                    {"value": "verify", "label": "Open the service through its official app or known address and check for alerts there.", "correct": True, "feedback": "Correct. Verify the claim through a channel you choose independently, rather than following the message link."},
                    {"value": "reply", "label": "Reply with your password and ask whether the message is real.", "correct": False, "feedback": "Never send your password in a message. The service's official support or app is a safer way to verify."},
                ],
            },
            {
                "prompt": "A caller claiming to be support asks you to read out a one-time sign-in code. What is the safest choice?",
                "choices": [
                    {"value": "share", "label": "Share it if the caller knows your name.", "correct": False, "feedback": "A name does not verify the caller. One-time codes are for you to enter into a sign-in flow you initiated, not share with others."},
                    {"value": "refuse", "label": "Do not share it; end the call and contact support using an official channel.", "correct": True, "feedback": "Correct. Keep sign-in codes private and independently verify unexpected support requests."},
                    {"value": "text", "label": "Text the code to the number that called so there is a record.", "correct": False, "feedback": "A text still gives the code to the caller. Keep it private and use an official contact method."},
                ],
            },
        ],
    },
    {
        "slug": "data-collection-and-tracking",
        "title": "Data Collection and Tracking",
        "category_slugs": (),
        "summary": "Learn what privacy notices and tracking choices can—and cannot—tell you.",
        "minutes": 5,
        "intro": "Websites and apps may collect information for core features, analytics, or advertising. Review available choices and share only what is needed for the service.",
        "learn": [
            "Look for what data is collected, why it is used, and how long it is retained.",
            "Review optional analytics or advertising controls where they are available.",
            "Remember that settings and legal choices vary by service and region.",
        ],
        "questions": [
            {
                "prompt": "A site offers optional advertising cookies alongside cookies needed for sign-in. What is a reasonable choice?",
                "choices": [
                    {"value": "accept", "label": "Accept every option because the site presented them together.", "correct": False, "feedback": "Optional choices can be reviewed separately. Choose only what you are comfortable with while keeping in mind some cookies support core features."},
                    {"value": "review", "label": "Review the options and decline non-essential tracking if you do not want it.", "correct": True, "feedback": "Correct. Review the available purposes and make an informed choice about optional tracking."},
                    {"value": "password", "label": "Enter a different password to stop tracking.", "correct": False, "feedback": "A password does not control cookie preferences. Use the site's privacy or cookie settings."},
                ],
            },
            {
                "prompt": "What is the most useful thing to check in a privacy notice?",
                "choices": [
                    {"value": "purpose", "label": "What information is collected, why it is used, and what choices are available.", "correct": True, "feedback": "Correct. These details help you understand the service's practices and make an informed choice."},
                    {"value": "logo", "label": "Whether the page has a familiar-looking logo.", "correct": False, "feedback": "A logo alone does not explain data practices. Review the notice and verify you are on the intended service."},
                    {"value": "nothing", "label": "Nothing; all services collect and use data in the same way.", "correct": False, "feedback": "Practices differ. Check the service's own notice and controls rather than assuming they are all alike."},
                ],
            },
        ],
    },
    {
        "slug": "privacy-settings-and-consent",
        "title": "Privacy Settings and Consent",
        "category_slugs": ("permissions", "social"),
        "summary": "Build a habit of reviewing privacy choices and granting only the access you intend.",
        "minutes": 4,
        "intro": "Privacy settings and consent controls help you choose how services use information. These choices can change, so revisit them when an app or your needs change.",
        "learn": [
            "Read what a setting changes before enabling it.",
            "Grant only permissions needed for a feature you use.",
            "Revisit privacy choices after app updates or changes in how you use a service.",
        ],
        "questions": [
            {
                "prompt": "A photo-editing app asks for access to your entire photo library, but you only want to edit one image. What should you check?",
                "choices": [
                    {"value": "all", "label": "Grant full access without checking for other options.", "correct": False, "feedback": "If your device supports it, selected-photo access may be enough. Choose the narrowest access that works for you."},
                    {"value": "selected", "label": "Look for selected-photo access and grant only the image you want to edit.", "correct": True, "feedback": "Correct. Limited access can provide the feature without exposing your full library."},
                    {"value": "contacts", "label": "Grant contacts access instead; it is a smaller permission.", "correct": False, "feedback": "Contacts are unrelated to editing an image. Choose a permission that matches the feature."},
                ],
            },
            {
                "prompt": "An app update adds a new optional data-sharing setting. What is a good next step?",
                "choices": [
                    {"value": "enable", "label": "Enable it automatically because it appeared in an update.", "correct": False, "feedback": "An update is a good reason to review new choices, not to enable them automatically."},
                    {"value": "review", "label": "Read what it shares and why, then decide whether to enable it.", "correct": True, "feedback": "Correct. Understand the purpose and make a deliberate choice based on your preferences."},
                    {"value": "ignore", "label": "Assume it cannot be changed after the first time.", "correct": False, "feedback": "Many services let you revisit settings. Check the app's privacy controls if your choice changes."},
                ],
            },
        ],
    },
]


MODULES_BY_SLUG = {module["slug"]: module for module in ACADEMY_MODULES}


def recommended_modules_for(result):
    if not result:
        return []

    scores = result.category_scores or {}
    recommended = []
    for module in ACADEMY_MODULES:
        matched = [
            (scores[slug]["score"], scores[slug]["name"])
            for slug in module["category_slugs"]
            if (
                slug in scores
                and isinstance(scores[slug], dict)
                and "score" in scores[slug]
                and scores[slug]["score"] < 80
            )
        ]
        if matched:
            item = dict(module)
            item["focus_score"], item["focus_category"] = min(matched, key=lambda match: match[0])
            recommended.append(item)
    return sorted(recommended, key=lambda item: (item["focus_score"], item["title"]))
