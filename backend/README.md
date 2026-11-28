# IshiLens Backend

> **Status:** Initial setup / planning phase. None of the backend endpoints, image processing pipelines, or model integrations described below are implemented yet.

## Project Overview

- **Project:** IshiLens
- **Purpose:** An AI-powered farming assistance application that helps farmers identify tomato ripeness and tomato leaf health.

## Planned Backend Technology Stack

- **Python**
- **FastAPI**
- **YOLO-based object detection models**
- **ONNX Runtime**
- **OpenCV** (for image processing)

## Planned Backend Responsibilities

- Receive JPEG images from the frontend.
- Perform tomato ripeness detection.
- Perform tomato leaf health detection.
- Process model predictions.
- Return structured JSON responses to the frontend.

## Planned API Endpoints

- `GET /health` — Check whether the backend server is running. *(Planned — not yet implemented)*
- `POST /detect` — Receive an image and return detection results. *(Planned — not yet implemented)*
