# MediInfo Backend

FastAPI backend for the MediInfo healthcare app.

## Setup

1. Clone the repo
2. Create virtual environment:
   python -m venv venv
   venv\Scripts\activate

3. Install dependencies:
   pip install fastapi uvicorn sqlalchemy psycopg2-binary passlib python-jose python-dotenv bcrypt

4. Copy .env.example to .env and fill in your credentials:
   cp .env.example .env

5. Run the server:
   uvicorn app.main:app --reload

6. Visit http://127.0.0.1:8000/docs