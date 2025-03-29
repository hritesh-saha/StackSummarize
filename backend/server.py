import os
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
STACK_EXCHANGE_API_BASE = os.getenv("STACK_EXCHANGE_API_BASE")

if not GEMINI_API_KEY:
    raise ValueError("Gemini API key is missing! Check your .env file.")

genai.configure(api_key=GEMINI_API_KEY)

app = FastAPI()

# Enable CORS (Allow all origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request body model
class QueryRequest(BaseModel):
    query: str

# Function to scrape Stack Overflow
def scrape_stackoverflow(query: str) -> str:
    query = query.strip().lower()  # Normalize query
    search_url = f"{STACK_EXCHANGE_API_BASE}/search?order=desc&sort=relevance&intitle={query}&site=stackoverflow"

    try:
        response = requests.get(search_url).json()
        print("🔎 Stack Overflow Search Response:", response)  # Debugging

        if "items" in response and response["items"]:
            top_result = response["items"][0]  # First relevant result
            question_id = top_result.get("question_id")

            if question_id:
                # Fetch answers for the question
                answer_url = f"{STACK_EXCHANGE_API_BASE}/questions/{question_id}/answers?order=desc&sort=votes&site=stackoverflow&filter=withbody"
                answer_data = requests.get(answer_url).json()
                print("📌 Top Answer Response:", answer_data)  # Debugging

                if "items" in answer_data and answer_data["items"]:
                    # Get the top-voted answer
                    answer_body = BeautifulSoup(answer_data["items"][0]["body"], "html.parser").text
                    return answer_body

    except requests.exceptions.RequestException as e:
        print("Error while fetching Stack Overflow data:", e)
        return "Error fetching data from Stack Overflow."

    return "No relevant answer found. Try rewording your query."

# Function to summarize response using Gemini
def summarize_text(text: str) -> str:
    model = genai.GenerativeModel("gemini-2.0-flash")
    response = model.generate_content(f"Summarize this in simple terms:\n{text}")
    return response.text.strip()

# API Endpoint
@app.post("/ask")
async def ask(request: QueryRequest):
    query = request.query.strip()

    if not query:
        raise HTTPException(status_code=400, detail="Query is required")

    stackoverflow_answer = scrape_stackoverflow(query)

    if stackoverflow_answer.startswith("No relevant answer found"):
        return {"answer": "I couldn't find a relevant answer. Try rewording your question."}
    
    if stackoverflow_answer.startswith("Error fetching data"):
        return {"answer": "There was an issue retrieving data. Please try again later."}

    summarized_answer = summarize_text(stackoverflow_answer)
    return {"answer": summarized_answer}

# Run with: uvicorn server:app --reload
