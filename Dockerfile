FROM python:3.12-slim

# postgresql dependencies
RUN apt-get update && apt-get install -y libpq-dev

# requirements
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# copy the backend code
COPY backend/ ./backend

# run the server
EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
