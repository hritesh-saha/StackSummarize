import os
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Load environment variables
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
STACK_EXCHANGE_API_BASE = os.getenv("STACK_EXCHANGE_API_BASE")

if not GEMINI_API_KEY:
    raise ValueError("Gemini API key is missing! Check your .env file.")

genai.configure(api_key=GEMINI_API_KEY)

# Initialize FastAPI app
app = FastAPI()

# Enable CORS
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

# Function to refine query using Gemini (ensures one-line output)
def refine_query(query: str) -> str:
    model = genai.GenerativeModel("gemini-2.0-flash")
    system_instruction = "Rewrite this query as a concise, Stack Overflow-friendly search term. Output only the refined search term, nothing else."
    
    response = model.generate_content(f"{system_instruction}\n\nUser Query: {query}")
    
    refined_query = response.text.strip().split("\n")[0]  # Ensure single-line output
    print(f"🔍 Gemini Refined Query: {refined_query}")  # Debugging
    return refined_query

# Function to scrape Stack Overflow and get top-voted answer
def scrape_stackoverflow(query: str) -> str:
    refined_query = refine_query(query)
    search_url = f"{STACK_EXCHANGE_API_BASE}/search?order=desc&sort=relevance&intitle={refined_query}&tagged=python&site=stackoverflow"
    
    print(f"🔍 Stack Overflow Search URL: {search_url}")  # Debugging

    try:
        response = requests.get(search_url).json()
        print("🔎 Stack Overflow Search Response:", response)  # Debugging

        if "items" in response and response["items"]:
            # Find the first question with at least one answer
            for item in response["items"]:
                if item.get("is_answered") and item.get("answer_count", 0) > 0:
                    question_id = item.get("question_id")
                    break
            else:
                return "No relevant answer found. Try rewording your query."

            answer_url = f"{STACK_EXCHANGE_API_BASE}/questions/{question_id}/answers?order=desc&sort=votes&site=stackoverflow&filter=withbody"
            
            print(f"📌 Fetching answers from: {answer_url}")  # Debugging
            
            answer_data = requests.get(answer_url).json()
            print("📌 Top Answer Response:", answer_data)  # Debugging

            if "items" in answer_data and answer_data["items"]:
                # Extract and clean the answer content
                answer_body = BeautifulSoup(answer_data["items"][0]["body"], "html.parser").text.strip()
                return answer_body

    except requests.exceptions.RequestException as e:
        print("❌ Error while fetching Stack Overflow data:", e)
        return "Error fetching data from Stack Overflow."

    return "No relevant answer found. Try rewording your query."

# Function to summarize response using Gemini with full context
def summarize_text(query: str, text: str) -> str:
    model = genai.GenerativeModel("gemini-2.0-flash")
    
    # Provide full context to Gemini
    prompt = f"""You are a helpful AI assistant. A user asked the following query:

    "{query}"

    Below is the most relevant answer from Stack Overflow:

    "{text}"

    Now, generate a response that correctly answers the user's query in a simple and accurate manner, keeping code snippets intact if any.
    """

    response = model.generate_content(prompt)
    
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

    # Send both query and answer to Gemini for better contextual response
    summarized_answer = summarize_text(query, stackoverflow_answer)
    
    return {"answer": summarized_answer}

# Run with: uvicorn server:app --reload
