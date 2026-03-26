# Lexify - AI Legal Assitant

Lexify is a comprehensive AI-powered platform designed to assist users in analyzing, summarizing, and understanding complex legal documents. Built with FastAPI and LangChain, it allows users to upload PDF or Word documents and leverages Retrieval-Augmented Generation (RAG) to provide contextual insights, clause-by-clause explanations, and an interactive chatbot experience over the document's content.

## Features

- **User Authentication**: Secure user registration and login utilizing JWT tokens and password hashing (bcrypt).
- **Document Processing**: Upload and extract text seamlessly from `.pdf` and `.docx` format documents.
- **Contextual Understanding (RAG)**: Employs large language models via LangChain & Groq to generate intelligent context summaries.
- **Clause Explanation**: Specifically tailored endpoints to analyze document clauses and explain them in plain language.
- **Interactive Chatbot**: Have a conversation with your document! The chatbot retains chat history to answer follow-up queries contextually.
- **Modern UI**: Serves a fast and responsive frontend using Jinja2 templates, HTML, CSS, and JavaScript.

## Tech Stack

- **Backend**: FastAPI, Uvicorn (ASGI server)
- **AI & RAG Framework**: LangChain, Groq API, HuggingFace (sentence-transformers)
- **Vector Store**: ChromaDB / FAISS
- **Database**: MongoDB (async communication via Motor)
- **Authentication**: python-jose (JWT), passlib (bcrypt)
- **Frontend**: Jinja2 Templates, Vanilla JS, CSS

## Prerequisites

- Python 3.10+
- MongoDB instance (local or MongoDB Atlas)
- Groq API Key (for LLM inference)

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/LDCCP.git
   cd LDCCP
   ```

2. **Create and activate a virtual environment:**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Linux/macOS
   # .venv\Scripts\activate   # On Windows
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Variables:**
   Create a `.env` file in the root directory and configure the necessary environment variables. Examples might include:
   ```env
   # Database Configuration
   MONGO_URI=your_mongodb_connection_string

   # AI / LLM Configuration
   GROQ_API_KEY=your_groq_api_key

   # Authentication Secret (for JWT)
   SECRET_KEY=your_super_secret_key
   ```

5. **Run the Application:**
   You can launch the backend server using the provided `launch.py` script:
   ```bash
   python launch.py
   ```
   Alternatively, run it directly with Uvicorn:
   ```bash
   uvicorn app.app:app --host 0.0.0.0 --port 8000 --reload
   ```

6. **Access the application:**
   Open your browser and navigate to `http://localhost:8000`.

## API Endpoints Overview

- **Frontend:**
  - `GET /` - Loads the main frontend UI.
- **Authentication:**
  - `POST /register` - Register a new user.
  - `POST /login` - Authenticate a user and receive a JWT.
  - `POST /profile` - Retrieve user profile information.
- **Document Services:**
  - `POST /api/upload-files` - Upload PDF/Docx and get a contextual summary.
  - `POST /api/clause-explaination` - Upload a document for clause breakdown.
- **Chatbot:**
  - `POST /chatbot/new-chat` - Initialize a new interactive chat session with an uploaded document.
  - `POST /chatbot/chat-reponse` - Query the chatbot regarding the previously uploaded document.

## License

This project is licensed under the Apache 2.0 License.
