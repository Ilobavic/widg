import os
import json
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Morning Brief API", docs_url="/api/docs", openapi_url="/api/openapi.json")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Resolve path to brief.json in root directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRIEF_PATH = os.path.join(BASE_DIR, "brief.json")

class BriefItem(BaseModel):
    source: str = Field(..., example="Slack")
    title: str = Field(..., example="Prod Login Failure in APAC")
    why: str = Field(..., example="Auth token service is returning 500 errors since the deployment.")
    action: str = Field(..., example="Check AWS ECS logs and roll back auth-service to v1.4.2")
    link: Optional[str] = Field(None, example="https://github.com/org/repo/issues/123")
    urgency: str = Field("medium", example="high") # high, medium, low

class BriefData(BaseModel):
    updated: str
    items: List[BriefItem]

DEFAULT_ITEMS = [
    {
        "source": "Slack",
        "title": "Auth API latency spike in APAC",
        "why": "Database connection pool exhausted due to unindexed query in user search endpoint.",
        "action": "Add index to user search email column and restart Auth task",
        "link": "https://github.com",
        "urgency": "high"
    },
    {
        "source": "Jira",
        "title": "Fix OAuth package vulnerability",
        "why": "Snyk reported a critical vulnerability in the jwt-decode dependency.",
        "action": "Upgrade jwt-decode package in frontend dependencies",
        "link": "https://jira.com",
        "urgency": "medium"
    },
    {
        "source": "Email",
        "title": "Security audit report ready",
        "why": "The Q2 external audit report requires team response for 3 minor items.",
        "action": "Complete security questionnaires before Friday",
        "link": None,
        "urgency": "low"
    }
]

def load_brief() -> dict:
    if os.path.exists(BRIEF_PATH):
        try:
            with open(BRIEF_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                if "items" in data:
                    return data
        except Exception:
            pass
    
    # Fallback/Default data
    default_brief = {
        "updated": datetime.now().strftime("%B %d, %Y %I:%M %p"),
        "items": DEFAULT_ITEMS
    }
    save_brief(default_brief)
    return default_brief

def save_brief(data: dict):
    try:
        with open(BRIEF_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving brief: {e}")

@app.get("/api/brief", response_model=BriefData)
def get_brief():
    return load_brief()

@app.post("/api/brief", response_model=BriefItem)
def add_brief_item(item: BriefItem):
    data = load_brief()
    data["items"].insert(0, item.dict())
    data["updated"] = datetime.now().strftime("%B %d, %Y %I:%M %p")
    save_brief(data)
    return item

@app.post("/api/brief/refresh", response_model=BriefData)
def refresh_brief():
    # In a real app, this would query Slack/Jira APIs.
    # For this project, we randomize mock items to simulate a sync.
    import random
    
    sync_sources = ["Slack", "Jira", "Email", "GitHub"]
    sync_titles = [
        "Database migrations failed on staging",
        "API rate limits reached for Stripe webhooks",
        "Review request: Refactor login flow PR #122",
        "Weekly billing report is now available",
        "SSL certificate renewal reminder",
        "Server CPU usage exceeds 90%"
    ]
    sync_whys = [
        "The migration script encountered a duplicate key constraint on the users table.",
        "Stripe webhook requests spiked by 300% after the marketing campaign launched.",
        "Needs senior engineer approval before merge to main branch.",
        "Monthly recurring revenue spiked by 12% following subscription tier changes.",
        "Domain certificates for api.production.com expire in 7 days.",
        "Memory leak in session manager causing high garbage collection cycles."
    ]
    sync_actions = [
        "Rollback migration, clean up dirty schema, and re-run migration script",
        "Upgrade Stripe endpoint rate-limiting thresholds or enable Redis cache",
        "Verify OAuth flows and approve PR #122",
        "Download report and forward to financial operations team",
        "Run Let's Encrypt renewal script on the primary server cluster",
        "Restart api-service node instances and analyze memory dumps"
    ]
    
    # Generate 2-4 random items
    num_items = random.randint(2, 4)
    new_items = []
    for _ in range(num_items):
        urg = random.choice(["high", "medium", "low"])
        idx = random.randint(0, len(sync_titles) - 1)
        new_items.append({
            "source": random.choice(sync_sources),
            "title": sync_titles[idx],
            "why": sync_whys[idx],
            "action": sync_actions[idx],
            "link": "https://github.com",
            "urgency": urg
        })
        
    refreshed_brief = {
        "updated": datetime.now().strftime("%B %d, %Y %I:%M %p"),
        "items": new_items
    }
    save_brief(refreshed_brief)
    return refreshed_brief
