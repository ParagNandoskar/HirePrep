"""FastAPI entrypoint for resume-nlp-service.

This wraps the existing Flask NLP app to preserve endpoint compatibility while
allowing uvicorn/FastAPI deployment.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.wsgi import WSGIMiddleware

from app import app as flask_app

app = FastAPI(
    title="HirePrep Resume NLP Service",
    version="1.0.0",
    description="Resume parsing and matching microservice"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/", WSGIMiddleware(flask_app))


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "5001"))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
