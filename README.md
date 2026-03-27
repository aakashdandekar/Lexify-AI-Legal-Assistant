# Lexify: AI Legal Assistant

Lexify is an intelligent, AI-powered legal document analysis and chat platform built to simplify the process of reviewing and understanding complex legal texts. With Lexify, users can securely upload legal documents (PDF/DOCX), get automated context summaries, detailed clause explanations, and interact with a persistent, intelligent chatbot to ask specific questions about their documents.

## Features

- **Robust Authentication**: Secure user registration and login using JWT tokens and bcrypt password hashing.
- **Document Processing**: Seamlessly upload and process `.pdf` and `.docx` files.
- **Context Understanding**: Automatically extracts and summarizes the core context of uploaded legal documents.
- **Clause Explanation**: Breaks down and explains complex legal clauses in plain language.
- **Interactive AI Chatbot**:
  - Ask specific questions about your uploaded documents.
  - Persistent chat history that can be saved and retrieved later.
  - Generates automatic chat titles based on conversation context.
- **Data Security**: Documents and chat histories are securely encrypted at rest using Fernet symmetric encryption.
- **Modern Tech Stack**: Powered by a high-performance FastAPI back-end and an integrated AI processing pipeline using LangChain.

## Technology Stack

- **Backend Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) (Async with Motor)
- **AI & NLP**: [LangChain](https://www.langchain.com/), local models via HuggingFace, Sentence-Transformers, ChromaDB/FAISS.
- **Frontend**: HTML/CSS/JS with Jinja2 Templating
- **Security**: Cryptography (Fernet), Passlib (Bcrypt), Python-JOSE (JWT)

## Local Development Setup

### Prerequisites

- Python 3.9+
- MongoDB instance (local or Atlas)
- Required API keys (e.g., HuggingFace, LLM providers if applicable)

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd LDCCP
```

### 2. Set up a virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create a `.env` file in the root directory and configure the following variables:

```env
# Database Configuration
MONGO_URI=mongodb://localhost:27017/  # Or your MongoDB Atlas URI
DB_NAME=lexify_db

# Security & Authentication
JWT_SECRET_KEY=your_super_secret_jwt_key
FERNET_KEY=your_fernet_encryption_key_base64

# External APIs
# Add any required LLM provider API keys here (e.g., GROQ_API_KEY if using Groq)
```

### 5. Run the Application

Start the FastAPI application using the provided launch script or Uvicorn directly:

```bash
uvicorn app.app:app --host 0.0.0.0 --port 8000 --reload
```

### 6. Access the Application

- **Frontend Application**: `http://localhost:8000/`
- **Swagger API Docs**: `http://localhost:8000/docs`
- **ReDoc API Docs**: `http://localhost:8000/redoc`

## API Endpoints Overview

| Group | Method | Endpoint | Description |
|---|---|---|---|
| **Auth** | `POST` | `/register` | Register a new user |
| **Auth** | `POST` | `/login` | Authenticate user and receive JWT |
| **User** | `POST` | `/profile` | Get current user profile details |
| **Analysis** | `POST` | `/api/upload-files` | Upload document and get context overview |
| **Analysis** | `POST` | `/api/clause-explaination`| Upload document and get clause explanations |
| **Chatbot** | `POST` | `/chatbot/new-chat` | Initialize a new chatbot session with a document |
| **Chatbot** | `POST` | `/chatbot/chat-reponse` | Interact with the active chatbot |
| **Chatbot** | `POST` | `/chatbot/save-chat` | Save the current active chat session |
| **Chatbot** | `POST` | `/chatbot/list-chat` | Retrieve history of saved chats |

## Security Note

This application handles sensitive legal documents. Ensure that your `FERNET_KEY` and `JWT_SECRET_KEY` are kept fully secure and never committed to version control. The application encrypts chat history files before storing them in the database to ensure maximum privacy.
