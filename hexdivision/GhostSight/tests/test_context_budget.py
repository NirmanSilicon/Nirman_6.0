"""The prompt cap and the reply budget must fit in the model's context."""

from ghostsight.intelligence.ai_prompt import MAX_PROMPT_CHARS
from ghostsight.intelligence.ollama_client import NUM_CTX, NUM_PREDICT

# Measured once with random printable ASCII: 1.89 characters per token
# (3178 tokens for 6018 characters). Rounded down for a margin.
WORST_CHARS_PER_TOKEN = 1.5


def test_worst_case_prompt_and_reply_fit_in_the_context() -> None:
    worst_prompt_tokens = MAX_PROMPT_CHARS / WORST_CHARS_PER_TOKEN
    assert worst_prompt_tokens + NUM_PREDICT <= NUM_CTX
