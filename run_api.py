#!/usr/bin/env python3
"""
Local dev runner for the Morning Brief FastAPI backend.
Run with: python run_api.py
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run("api.index:app", host="127.0.0.1", port=8000, reload=True)
