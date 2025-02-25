FROM python:3.12-slim

# requirements
WORKDIR /app
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# copy the backend code and environment variables
COPY backend/ ./backend
COPY .env /app/.env

# get the wait-for-it script and make it executable
COPY wait-for-it.sh /wait-for-it.sh
RUN chmod +x /wait-for-it.sh

# run the server
WORKDIR /app/backend
EXPOSE 8000
CMD /wait-for-it.sh postgres:5432 --timeout=5 -- uvicorn main:app --host 0.0.0.0 --port 8000 --reload