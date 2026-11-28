
import os
import tempfile
from typing import Optional, Literal

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel, Field

from chatbot import chat


router = APIRouter(
    prefix="/chat",
    tags=["KisanAI Chatbot"]
)


# Supported languages
Language = Literal["English", "Hindi", "Odia"]


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)

    plant: Optional[str] = None

    confidence: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0
    )

    language: Language = "English"


class ChatResponse(BaseModel):
    reply: str


# Text chatbot endpoint
@router.post("", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):

    try:
        reply = chat(
            message=request.message,
            plant=request.plant,
            confidence=request.confidence,
            language=request.language
        )

        return ChatResponse(reply=reply)

    except Exception as error:
        print("CHAT API ERROR:", error)

        raise HTTPException(
            status_code=500,
            detail="Unable to generate chatbot response."
        )


# Whisper model is loaded only when voice transcription is requested
whisper_model = None


def get_whisper_model():

    global whisper_model

    if whisper_model is None:
        from faster_whisper import WhisperModel

        whisper_model = WhisperModel(
            "small",
            device="cpu",
            compute_type="int8"
        )

    return whisper_model


# Voice transcription endpoint
@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):

    suffix = os.path.splitext(audio.filename or "")[1] or ".webm"

    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix
        ) as temp:

            temp.write(await audio.read())
            temp_path = temp.name

        model = get_whisper_model()

        segments, info = model.transcribe(temp_path)

        transcript = "".join(
            segment.text for segment in segments
        ).strip()

        return {
            "transcript": transcript,
            "language": info.language
        }

    except Exception as error:
        print("VOICE TRANSCRIPTION ERROR:", error)

        raise HTTPException(
            status_code=503,
            detail="Voice transcription is currently unavailable."
        )

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
