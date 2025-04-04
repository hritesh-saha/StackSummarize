import os
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import re

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
STACK_EXCHANGE_API_BASE = os.getenv("STACK_EXCHANGE_API_BASE")

if not GEMINI_API_KEY:
    raise ValueError("Gemini API key is missing! Check your .env file.")

genai.configure(api_key=GEMINI_API_KEY)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    query: str

def scrape_stackoverflow(query: str) -> str:
    """
    Searches Stack Overflow for the most relevant answer.
    """
    search_url = f"{STACK_EXCHANGE_API_BASE}/search?order=desc&sort=relevance&intitle={query}&site=stackoverflow"
    
    # print(f"🔍 Stack Overflow Search URL: {search_url}")

    try:
        response = requests.get(search_url).json()
        print("🔎 Stack Overflow Search Response:", response)

        if "items" in response and response["items"]:
            # Find the first question with at least one answer
            for item in response["items"]:
                if item.get("is_answered") and item.get("answer_count", 0) > 0:
                    question_id = item.get("question_id")
                    break
            else:
                return None  

            answer_url = f"{STACK_EXCHANGE_API_BASE}/questions/{question_id}/answers?order=desc&sort=votes&site=stackoverflow&filter=withbody"
            
            print(f"Fetching answers from: {answer_url}")
            
            answer_data = requests.get(answer_url).json()
            print("Top Answer Response:", answer_data)

            if "items" in answer_data and answer_data["items"]:
                # Extract and clean the answer content
                answer_body = BeautifulSoup(answer_data["items"][0]["body"], "html.parser").text.strip()
                return answer_body

    except requests.exceptions.RequestException as e:
        print("Error while fetching Stack Overflow data:", e)
        return "Error fetching data from Stack Overflow."

    return None 


model = genai.GenerativeModel("gemini-2.0-flash", system_instruction="""
    AI Text Summarizer for Stack Overflow Answers  

Role: Expert Technical Summarizer  

Responsibilities:  
You are an expert in summarizing Stack Overflow answers into beginner-friendly explanations. Your role is to:  

- **Simplify complex explanations** while keeping technical accuracy.  
- **Maintain code snippets** exactly as they are with proper indentation.  
- **Provide concise yet helpful summaries** so the user quickly understands the key points.  
- **Exclude unnecessary details** while ensuring clarity.  
- **Ensure completeness** by filling in any missing or incomplete parts of the answer.  

Guidelines:  
- **Format the entire response in Markdown.**  
- **All code should be inside a single fenced code block (` ``` `) with the correct language.**  
- **All explanations should be normal text, not inside code blocks.**  
- **Variable names must be bold (`**variable_name**`)**, NOT inside `inline code`.  
- **Loops and control structures** (e.g., `for loop`, `while loop`) should be bold for emphasis (`**for loop**`).  
- **Never format explanations as code.** Only the actual code itself should be inside a code block.  
- **If the response is incomplete, complete it with accurate information.**  
- **Fix minor code errors without making drastic changes.**  
- **Do NOT include introductory phrases like**:  
  - "Here's a simplified explanation of..."  
  - "This is how it works..."  
  - "Let me break it down..."  
- **Start directly with the explanation** without unnecessary introductions.  
- **If a response lacks crucial context or examples, add them to ensure a complete answer.**  
""")


def format_summary(response: str) -> str:
    """
    Formats the AI-generated summary for clarity, Markdown compliance, and proper code handling.
    Ensures variable names are bolded only in text, not inside code blocks.
    """
    # Extract all code blocks and replace them with placeholders
    code_blocks = re.findall(r"```[\s\S]*?```", response)
    code_placeholders = [f"[[CODE_BLOCK_{i}]]" for i in range(len(code_blocks))]
    
    for i, block in enumerate(code_blocks):
        response = response.replace(block, code_placeholders[i], 1)

    # Bold variable names (avoid inline code formatting)
    response = re.sub(r"`(\w+)`", r"**\1**", response)  # Change `variable` -> **variable**

    # Bold control structures
    keywords = [
        r"\bfor\s+loop\b", 
        r"\bwhile\s+loop\b", 
        r"\bdo-while\s+loop\b", 
        r"\bforeach\s+loop\b", 
        r"\bloop\b", 
        r"\biteration\b"
    ]

    for keyword in keywords:
        response = re.sub(rf"(?<!`){keyword}(?!`)", lambda m: f"**{m.group(0)}**", response, flags=re.IGNORECASE)

    # Restore original code blocks
    for i, block in enumerate(code_blocks):
        response = response.replace(code_placeholders[i], block, 1)

    return response.strip()


def summarize_text(query: str, text: str) -> str:
    """
    Summarizes a Stack Overflow response in a beginner-friendly manner 
    while keeping code snippets unchanged and ensuring proper Markdown formatting.
    """
    prompt = f"""
        A user asked the following question:

        "{query}"

        Below is the most relevant answer from Stack Overflow:

        "{text}"

        Summarize this in a beginner-friendly manner with the following rules:
        - **All code should be inside a single fenced code block (` ``` `)**
        - **All explanations should be in normal text. Never format explanations as code.**
        - **Variable names must be bold (`**variable_name**`)**, NOT inside `inline code`.
        - **Loops and control structures** (e.g., `for loop`, `while loop`) should be bold (`**for loop**`).
        - Format everything in proper Markdown.
    """

    response = model.generate_content(prompt)
    
    return format_summary(response.text.strip())

@app.post("/ask")
async def ask(request: QueryRequest):

    query = request.query.strip()

    if not query:
        raise HTTPException(status_code=400, detail="Query is required")

    stackoverflow_answer = scrape_stackoverflow(query)

    if not stackoverflow_answer:

        ai_prompt = f"""
        A user asked the following technical question:

        "{query}"

        No relevant answer was found on Stack Overflow. 
        Provide a beginner-friendly explanation with proper Markdown formatting.
        - Start with: "Okay, here's a beginner-friendly explanation of **{query}**, formatted for clarity and ease of understanding:"
        - Maintain proper indentation for code.
        - Format all code inside a single fenced code block (```) in the correct language.
        - Make sure variable names are **bold** (e.g., **array** instead of `array`).
    """
        response = model.generate_content(ai_prompt)
        ai_answer = format_summary(response.text.strip())
        return {"answer": ai_answer}
    
    # If Stack Overflow has an answer, summarize it
    summarized_answer = summarize_text(query, stackoverflow_answer)
    formatted_response = f"Okay, here's a beginner-friendly explanation of **{query}**, formatted for clarity and ease of understanding:\n\n{summarized_answer}"
    
    return {"answer": formatted_response}

# Run the server with: uvicorn server:app --reload
