import json
import os
import re
import time

from anthropic import Anthropic

client = Anthropic()  # ANTHROPIC_API_KEY environment variable se
MODEL = "claude-sonnet-5-5"
OUT = "../dataset"
CLASSES = [1, 5, 10]   # pehle 3 class; baad me list(range(1, 11))
PER_BATCH = 20

LEVEL = {
    1: "Age 6-7. Very short sentences (max 8 words), 2-3 sentences total. Only everyday things (family, animals, fruits, colours). Small numbers only. No technical words.",
    2: "Age 7-8. Short sentences, 2-3 sentences. Everyday examples. Small numbers. Simple words only.",
    3: "Age 8-9. Short clear sentences, 3 sentences. Easy examples from home and school. Small numbers.",
    4: "Age 9-10. Simple sentences, 3-4 sentences. A basic term is fine if explained in one line.",
    5: "Age 10-11. Simple explanation, 4 sentences. Basic terms with their meaning.",
    6: "Age 11-12. Clear explanation, 4-5 sentences. Introduce technical terms with meaning.",
    7: "Age 12-13. 5 sentences. Technical terms and simple formulas allowed.",
    8: "Age 13-14. Concept plus reason. Formulas allowed.",
    9: "Age 14-15. Proper subject terms, formulas and reasoning, exam-style clarity.",
    10: "Age 15-16. Board-exam level: precise definitions, formulas, step-wise solutions.",
}

CURR_FILE = "curriculum_map.json"
CURR = json.load(open(CURR_FILE, encoding="utf-8")) if os.path.exists(CURR_FILE) else {}

FIELDS = "class, subject, chapter, topic, language, teaching_style, question, response"
FORMAT = "JSON Lines format me do (har line ek JSON object, koi extra text ya markdown code block nahi)."


def max_words(c):
    return 40 if c <= 2 else 70 if c <= 5 else 100 if c <= 8 else 120


def subjects_for(c):
    if c <= 2:
        return ["English", "Hindi", "Mathematics"]
    if c <= 5:
        return ["English", "Hindi", "Mathematics", "EVS"]
    return ["English", "Hindi", "Mathematics", "Science", "Social Science"]


def ask(prompt, max_tokens=8000):
    r = client.messages.create(
        model=MODEL, max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    return r.content[0].text


def chapters_for(c, subject):
    listed = CURR.get(str(c), {}).get(subject)
    if listed:
        return listed
    t = ask(f"NCERT/CBSE Class {c} {subject} textbook ke 6 chapters ke naam do. "
            "Sirf JSON list of strings, aur kuch nahi.", 500)
    return json.loads(re.search(r"\[.*\]", t, re.S).group(0))


def common_rules(c):
    return f"""Level guide (Class {c}): {LEVEL[c]}
Maximum {max_words(c)} words per response.

Rules:
1. language: "english", "hindi" ya "hinglish" (lagbhag 40% hinglish, 30% english, 30% hindi).
   hindi Devanagari me, hinglish roman script me.
2. teaching_style: "simple", "detailed", "step_by_step", "example", "exam_ready", "basic" ka mix.
3. Bhasha, shabd aur examples SIRF Class {c} ke bachche ke level ke hon, usse upar ke nahi.
4. question bachche ki tarah naturally likho (kabhi chhota, kabhi poora).
5. response sidha jawab ho. "Answer:", "Explanation:", "Steps:" labels aur markdown (**, #) mat likho.
6. Saare facts, formulas aur calculations bilkul sahi hon. Textbook ka text copy mat karo.
7. Har example alag ho."""


def p_normal(c, subject, chapter):
    return f"""School tutor AI ke fine-tuning ka data chahiye.
Class {c}, Subject {subject}, Chapter {chapter}.
Exactly {PER_BATCH} examples {FORMAT}
Fields: {FIELDS}
{common_rules(c)}
8. 2 examples aise do jisme sawal unclear ho ya syllabus se bahar ho; response politely kahe ki
   pakka nahi pata aur teacher se puchne ko kaho."""


def p_above(c, subject):
    far = "college ya competitive exam level ka" if c >= 9 else "kam se kam 3-4 class aage ka"
    return f"""School tutor AI ke fine-tuning ka data chahiye.
Class {c} ka student, Subject {subject}. Student ne aisa sawal pucha jo {far} hai.
Exactly 8 examples {FORMAT}
Fields: {FIELDS} (chapter aur topic khali string rakh sakte ho)
{common_rules(c)}
Response ka format: friendly tarah se batao ki ye topic aage ki class me seekhoge, phir sirf ek bahut
simple baat batao jo Class {c} ka bachcha samjhe, ya abhi ke chapter ka koi sawal puchne ko kaho.
Poora answer mat do. teaching_style "simple" rakho."""


def p_general(c):
    return f"""School tutor AI ke fine-tuning ka data chahiye.
Class {c} ka student, jo koi subject nahi chun paya. Subject: General.
Exactly 15 alag-alag subjects (English, Hindi, Maths, Science/EVS, Social) ke Class {c} level ke sawal {FORMAT}
Fields: {FIELDS} (chapter aur topic khali string rakh sakte ho)
{common_rules(c)}"""


def parse(text, c, subject, chapter=None):
    rows = []
    for line in text.splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            o = json.loads(line)
        except json.JSONDecodeError:
            continue
        if not all(str(o.get(k, "")).strip() for k in ("question", "response", "language", "teaching_style")):
            continue
        if len(str(o["response"]).split()) > max_words(c) * 1.3:
            continue
        o["class"] = c
        o["subject"] = subject
        if chapter:
            o["chapter"] = chapter
        rows.append(o)
    return rows


def save(path, rows):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def slug(s):
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")[:40]


def run(path, prompt, c, subject, chapter=None, label=""):
    if os.path.exists(path):
        return  # resume: bani hui file skip
    try:
        rows = parse(ask(prompt), c, subject, chapter)
    except Exception as e:
        print("FAIL", label, e)
        return
    save(path, rows)
    print(label, len(rows))
    time.sleep(1)


# ---------- contrast: same sawal, alag class ----------
CONCEPTS = [
    ("science", "What is a plant?", [3, 5, 8, 10]),
    ("science", "What is force?", [4, 7, 10]),
    ("science", "What is heat?", [4, 6, 9]),
    ("maths", "What is a fraction?", [3, 5, 7, 9]),
    ("maths", "What is a triangle?", [2, 5, 8, 10]),
    ("maths", "What is multiplication?", [2, 4, 6]),
    ("english", "What is a noun?", [2, 4, 6, 9]),
    ("english", "What is a verb?", [2, 5, 7, 10]),
    ("social", "What is a map?", [3, 6, 9]),
]


def subj(key, c):
    if key == "maths":
        return "Mathematics"
    if key == "english":
        return "English"
    if key == "science":
        return "General" if c <= 2 else ("EVS" if c <= 5 else "Science")
    return "General" if c <= 2 else ("EVS" if c <= 5 else "Social Science")


def p_contrast(key, q, classes):
    lines = "\n".join(
        f"- Class {c} (subject: {subj(key, c)}): {LEVEL[c]} | max {max_words(c)} words" for c in classes)
    return f"""Ek hi sawal "{q}" alag-alag class ke bachchon ne pucha. Har class ke liye uske level ka jawab do.
Har class ke liye 3 JSON lines do: language "english", "hindi", "hinglish" (sawal ko us language me likho).
Classes:
{lines}
Fields: {FIELDS} (topic = concept ka naam, chapter khali string, teaching_style "simple")
{FORMAT}
Jawab ka level aur depth class ke saath saaf badalna chahiye (chhoti class me bahut saral, badi class me
zyada technical). "Answer:" jaisa label ya markdown mat likho. Facts bilkul sahi hon."""


def run_contrast():
    path = os.path.join(OUT, "contrast", "contrast.jsonl")
    if os.path.exists(path):
        return
    rows = []
    for key, q, classes in CONCEPTS:
        try:
            text = ask(p_contrast(key, q, classes))
        except Exception as e:
            print("FAIL contrast", q, e)
            continue
        for line in text.splitlines():
            line = line.strip()
            if not line.startswith("{"):
                continue
            try:
                o = json.loads(line)
                c = int(o["class"])
            except Exception:
                continue
            if c not in classes or not str(o.get("response", "")).strip():
                continue
            if len(str(o["response"]).split()) > max_words(c) * 1.3:
                continue
            o["subject"] = subj(key, c)
            o["teaching_style"] = "simple"
            rows.append(o)
        time.sleep(1)
    save(path, rows)
    print("contrast", len(rows))


for c in CLASSES:
    folder = os.path.join(OUT, f"class_{c:02d}")
    run(os.path.join(folder, "batch_general.jsonl"), p_general(c), c, "General", label=f"C{c} General")
    for subject in subjects_for(c):
        run(os.path.join(folder, f"batch_above_{slug(subject)}.jsonl"),
            p_above(c, subject), c, subject, label=f"C{c} {subject} above-class")
        try:
            chapters = chapters_for(c, subject)
        except Exception as e:
            print("chapter list fail:", c, subject, e)
            continue
        for ch in chapters:
            run(os.path.join(folder, f"batch_{slug(subject)}_{slug(ch)}.jsonl"),
                p_normal(c, subject, ch), c, subject, ch, label=f"C{c} {subject} | {ch}")

run_contrast()