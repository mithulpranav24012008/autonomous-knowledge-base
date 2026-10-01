from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import pipeline

app = FastAPI(
    title="Data Pipeline FastAPI Backend",
    description="Python data pipeline backend for processing tasks with Gemini AI and MongoDB",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pipeline.router)

@app.get("/")
def root():
    return {
        "message": "FastAPI Data Pipeline Service is Running",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    from app.config import FASTAPI_PORT
    uvicorn.run("main:app", host="0.0.0.0", port=FASTAPI_PORT, reload=True)
