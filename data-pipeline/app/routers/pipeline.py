from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google import genai
from app.config import GEMINI_API_KEY, MONGODB_URI

router = APIRouter(prefix="/pipeline", tags=["pipeline"])

class PipelineRequest(BaseModel):
    data: str
    prompt: str = "Analyze this data for pipeline processing"

@router.get("/status")
def get_pipeline_status():
    return {
        "status": "active",
        "service": "python-fastapi-pipeline",
        "has_gemini_key": bool(GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here"),
        "mongodb_uri_configured": bool(MONGODB_URI),
    }

@router.post("/process")
def process_pipeline_data(payload: PipelineRequest):
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
        raise HTTPException(status_code=400, detail="GEMINI_API_KEY is not configured.")

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=f"{payload.prompt}:\n{payload.data}",
        )
        return {
            "processed": True,
            "result": response.text,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
