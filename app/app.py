import io
import os
import traceback
import asyncio
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, File, UploadFile, Depends, Form, Query, Request
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from bson import ObjectId
from cryptography.fernet import Fernet
from app.database.db import database, serialize
from app.models.schema import User, Login, Context_history, Chatbot
from app.core.auth import hash, check_hash, get_current_user, create_access_token
from app.services.document import pdf_to_text, docx_to_text
from app.services.rag import context_understanding_model, clause_explaination, chatbot_Response, generate_title

#Router
app = FastAPI(
    servers=[{"url": "http://localhost:8000"}]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

#Encryption Config
f = Fernet(os.getenv("FERNET_KEY"))

#Frontend
@app.get('/')
async def load_frontend(request:Request):
    return templates.TemplateResponse('index.html', {'request': request})

#Authntication & Authorization
@app.post('/register')
async def register_user(user: User):
    try:
        collection = database["user"]

        exist = await collection.find_one({
            "$or": [
                {"email": user.email}
            ]
        })

        if exist:
            raise HTTPException(status_code=400, detail="User already exists!")

        password = hash(password=user.password)

        result = await collection.insert_one({
            "name": user.name,
            "email": user.email,
            "password": password,
            "access-tier": "B2C",
            "created_at": datetime.now(tz=timezone.utc)
        })

        token = create_access_token(str(result.inserted_id))

        return {"access-token": token}

    except HTTPException:
        raise

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@app.post('/login')
async def login_user(login: Login):
    try:
        collection = database["user"]
        user = await collection.find_one({
            "email": login.email
        })

        if not user:
            return HTTPException(status_code=400, detail="User not found")

        if check_hash(login.password, user["password"]):
            token = create_access_token(str(user["_id"]))
        else:
            raise HTTPException(status_code=401, detail="Invalid Credentials")

        return {"access_token": token}

    except HTTPException:
        raise

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

#Routes
@app.post('/profile')
async def profile(current_user: str = Depends(get_current_user)):
    try:
        collection = database['user']

        result = await collection.find_one({"_id": ObjectId(current_user)})
        name = result.get("name", "")

        return {"response": name}

    except HTTPException:
        raise

    except Exception as e:
        print(f"Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")

@app.post('/api/upload-files')
async def upload_files(
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user)
):
    try:
        contents = await file.read()

        if file.filename.endswith(".pdf"):
            data = await asyncio.to_thread(pdf_to_text, contents)
        elif file.filename.endswith(".docx"):
            data = await asyncio.to_thread(docx_to_text, contents)
        else:
            raise HTTPException(status_code=400, detail="File must be a PDF of Docx")

        if not data.strip():
            raise HTTPException(status_code=400, detail="Empty or unreadable document")

        response = await context_understanding_model(
            docs=data
        )

        return {"response": response}

    except HTTPException:
        raise

    except Exception as e:
        print(f"Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")

@app.post('/api/clause-explaination')
async def clause_explaination_api(
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user)
):
    try:
        contents = await file.read()

        if file.filename.endswith(".pdf"):
            data = await asyncio.to_thread(pdf_to_text, contents)
        elif file.filename.endswith(".docx"):
            data = await asyncio.to_thread(docx_to_text, contents)
        else:
            raise HTTPException(status_code=400, detail="File must be a PDF of Docx")

        if not data.strip():
            raise HTTPException(status_code=400, detail="Empty or unreadable document")

        response = await clause_explaination(
            docs=data
        )

        return {"response": response}

    except HTTPException:
        raise

    except Exception as e:
        print(f"Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")

@app.post('/chatbot/new-chat')
async def chatbot_reference(
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user)
):
    try:
        contents = await file.read()
        data = None

        if file.filename.endswith(".pdf"):
            data = await asyncio.to_thread(pdf_to_text, contents)
        elif file.filename.endswith(".docx"):
            data = await asyncio.to_thread(docx_to_text, contents)
        else:
            raise HTTPException(status_code=400, detail="File must be a PDF of Docx")

        if not data.strip():
            raise HTTPException(status_code=400, detail="Empty or unreadable document")

        collection = database['chatbot']
        record = await collection.find_one({"user_id": current_user})

        if not record:
            await collection.insert_one({
                "user_id": current_user,
                "file": data,
                "last_save": "",
                "date_save": datetime.now(tz=timezone.utc)
            })
        else:
            await collection.update_one(
                {"user_id": current_user},
                {"$set": {"file": data, "last_save": "", "date_save": datetime.now(tz=timezone.utc)}}
            )

        return {"message": "New Chat"}

    except HTTPException:
        raise

    except Exception as e:
        print(f"Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")

@app.post('/chatbot/chat-reponse')
async def chat_reponses(
    query: str,
    current_user = Depends(get_current_user)
):
    try:
        collection = database['chatbot']    
        record = await collection.find_one({"user_id": current_user})
        document = record.get("file", "")
        history = record.get("last_save", "")

        response = await chatbot_Response(
            docs=document,
            chat_history=history,
            query=query
        )

        answer = response.get("Answer", "")
        refs = response.get("Referenced Section(s)", "")
        disc = response.get("Disclaimer", "")
        
        response = answer
        if refs and str(refs).strip() and str(refs).strip().lower() != "none":
            response += f"\n\nReferences: {refs}"
        if disc and str(disc).strip() and str(disc).strip().lower() != "none":
            response += f"\n\nDisclaimer: {disc}"

        response = response.replace("User Response:", "User:").replace("System Response:", "System:")

        updated_data = f"\nUser Response: {query}\nSystem Response: {response}\n"
        history = history + updated_data

        MAX_HISTORY_CHARS = 5000
        if len(history) > MAX_HISTORY_CHARS:
            history = history[-MAX_HISTORY_CHARS:]

        await collection.update_one(
            {"user_id": current_user},
            {"$set": {"last_save": history}}
        )

        return {"response": response}

    except HTTPException:
        raise

    except Exception as e:
        print(f"Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")

@app.post('/chatbot/save-chat')
async def chatbot_savechat(
    current_user: User = Depends(get_current_user)
):
    try:
        chatbot_collection = database['chatbot']
        collection = database['chats']

        record = await chatbot_collection.find_one({"user_id": current_user})

        if not record:
            raise HTTPException(status_code=404, detail="No active chat session found")

        file_content = record.get("file", "")
        context = record.get("last_save", "")
        title = await generate_title(context=context)

        data = f.encrypt(file_content.encode())

        result = await collection.insert_one({
            "user_id": current_user,
            "title": title,
            "file": data,
            "history": context
        })

        return {"Chat Reference ID": str(result.inserted_id)}

    except HTTPException:
        raise

    except Exception as e:
        print(f"Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")

@app.post('/chatbot/list-chat')
async def list_chatbot(
    current_user: User = Depends(get_current_user)
):
    try:
        collection = database['chats']
        records = await collection.find({"user_id": current_user}).to_list(length=None)

        result = []
        for record in records:
            file = record.get("file", b"")
            try:
                decrypted_file = f.decrypt(file).decode() if isinstance(file, bytes) else file
            except:
                decrypted_file = str(file)
                
            result.append({
                "_id": str(record["_id"]),
                "title": record.get("title", ""),
                "history": record.get("history", ""),
                "file": decrypted_file
            })

        return {"chatbot_log": result}

    except HTTPException:
        raise

    except Exception as e:
        print(f"Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Interval Server Error")