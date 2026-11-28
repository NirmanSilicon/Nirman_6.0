
import json
import urllib.request
import urllib.error
from typing import Optional


# Ollama configuration
OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
OLLAMA_MODEL = "llama3.2:latest"


# Supported languages
LANGUAGES = {
    "English": "English",
    "Hindi": "Hindi (हिंदी)",
    "Odia": "Odia (ଓଡ଼ିଆ)"
}


# KisanAI system instructions
SYSTEM_PROMPT = """
You are KisanAI, a helpful agricultural AI assistant.

Your main purpose is to provide practical and reliable farming guidance.

You can help with:

1. Crop cultivation and crop management.
2. Rice and other crop varieties.
3. Soil preparation and soil health.
4. Irrigation and water management.
5. Fertilizers and nutrient deficiencies.
6. Sowing, transplanting and harvesting.
7. Pests and crop diseases.
8. Plant symptoms and crop care.
9. Weather-related farming precautions.
10. Yield improvement and sustainable farming.

IMPORTANT AGRICULTURAL RULES:

- Give practical, step-by-step advice.
- Ask follow-up questions if important information is missing.
- Never claim that a disease is confirmed from symptoms alone.
- Explain possible causes instead of inventing a diagnosis.
- Do not invent crop scan results or confidence scores.
- Never recommend a pesticide dosage without reliable context.
- Encourage local agricultural expert advice for serious crop problems.
- Clearly distinguish general guidance from confirmed diagnosis.
- Use simple language that farmers can understand.

SCANNER RULES:

The crop scanner identifies plants only.
It does NOT diagnose diseases.

If scanner information is provided, use it as crop context.

Scanner confidence represents plant identification confidence,
not disease diagnosis confidence.

If confidence is low, tell the user to verify the plant identification.

RESPONSE STYLE:

- Be friendly and respectful.
- Give clear and useful answers.
- Use numbered steps when helpful.
- Avoid unnecessarily long answers.
- Do not repeat the same sentences.
"""


def build_prompt(
    message: str,
    plant: Optional[str] = None,
    confidence: Optional[float] = None,
    language: str = "English"
) -> str:

    selected_language = LANGUAGES.get(language, "English")

    context = ""

    if plant:

        confidence_text = (
            f"{confidence * 100:.1f}%"
            if confidence is not None
            else "Unknown"
        )

        context = f"""
CURRENT CROP SCANNER CONTEXT:

Identified plant: {plant}
Plant identification confidence: {confidence_text}

Use this information as crop context.

Do not treat scanner confidence as disease diagnosis confidence.
"""

    return f"""
{SYSTEM_PROMPT}

MANDATORY LANGUAGE RULE:

The user selected: {selected_language}

Your entire answer MUST be written in {selected_language}.

Do not answer in Punjabi or any other language.

Do not mix languages unnecessarily.

Keep technical farming terms simple and explain them when needed.

{context}

USER QUESTION:
{message}

KISANAI ANSWER:
"""


def chat(
    message: str,
    plant: Optional[str] = None,
    confidence: Optional[float] = None,
    language: str = "English"
) -> str:

    if not message or not message.strip():
        return "Please enter your farming question."

    if language not in LANGUAGES:
        language = "English"

    prompt = build_prompt(
        message=message.strip(),
        plant=plant,
        confidence=confidence,
        language=language
    )

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "keep_alive": "5m",
        "options": {
            "temperature": 0.4,
            "top_p": 0.85,
            "repeat_penalty": 1.15,
            "num_ctx": 2048,
            "num_predict": 400
        }
    }

    try:

        request = urllib.request.Request(
            OLLAMA_URL,
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers={
                "Content-Type": "application/json"
            },
            method="POST"
        )

        with urllib.request.urlopen(
            request,
            timeout=180
        ) as response:

            result = json.loads(
                response.read().decode("utf-8")
            )

        answer = result.get("response", "").strip()

        if not answer:
            print("OLLAMA EMPTY RESPONSE:", result)
            return "Sorry, I could not generate an answer. Please try again."

        return answer

    except urllib.error.HTTPError as error:

        error_details = error.read().decode(
            "utf-8",
            errors="replace"
        )

        print("OLLAMA HTTP ERROR:", error.code)
        print("OLLAMA ERROR DETAILS:", error_details)

        return (
            "KisanAI AI engine encountered an error. "
            "Please try again."
        )

    except urllib.error.URLError as error:

        print("OLLAMA CONNECTION ERROR:", error)

        return (
            "I could not connect to the KisanAI AI engine. "
            "Please make sure Ollama is running."
        )

    except TimeoutError as error:

        print("OLLAMA TIMEOUT ERROR:", error)

        return (
            "The AI is taking too long to respond. "
            "Please try again."
        )

    except json.JSONDecodeError as error:

        print("OLLAMA JSON ERROR:", error)

        return (
            "The AI returned an invalid response. "
            "Please try again."
        )

    except Exception as error:

        print("CHATBOT ERROR:", error)

        return (
            "Sorry, something went wrong while generating "
            "the answer."
        )
