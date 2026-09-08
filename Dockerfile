FROM python:3.12-slim

# requirements
WORKDIR /app
COPY requirements.txt .
RUN pip install --upgrade pip
# use cache volume to speed up the build
# RUN pip install --cache-dir=/root/.cache/pip --prefer-binary -r requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt

# cv2 and gstreamer requirements
RUN apt-get update && apt-get install -y \
    gstreamer1.0-rtsp \
    gstreamer1.0-x \
    gstreamer1.0-gl \
    gstreamer1.0-vaapi \
    gstreamer1.0-tools \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-ugly \
    gstreamer1.0-libav \
    libgstreamer1.0-0 \
    libgstreamer-plugins-base1.0-0 \
    libgirepository-1.0-1 \
    gobject-introspection \
    gir1.2-gst-plugins-base-1.0 \
    gir1.2-gstreamer-1.0 \
    libsm6 libxext6 libgl1-mesa-glx \
    pkg-config libcairo2-dev && \
    rm -rf /var/lib/apt/lists/*

# copy the backend code and environment variables
COPY backend/ ./backend
COPY .env /app/.env

# get the bash scripts and make them executable
COPY start_workers.sh /app/start_workers.sh
RUN chmod +x /app/start_workers.sh

COPY wait-for-it.sh /wait-for-it.sh
RUN chmod +x /wait-for-it.sh

COPY data/ /app/data


# run the server
WORKDIR /app/backend
EXPOSE 8000
CMD ["/wait-for-it.sh", "postgres:5432", "--timeout=5", "--", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--ws-ping-interval", "0", "--ws-ping-timeout", "0"]