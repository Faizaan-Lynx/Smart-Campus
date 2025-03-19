# Smart-Campus

The **Smart-Campus** system is developed by **Lynx InfoSec**.

<br>

## Setup Instructions

Before building or pulling the repository, ensure the following two commands are executed to ensure correct line endings:

```bash
git config --global core.autocrlf false
git config --global core.eol lf
```

These configurations will ensure that line-endings match those used by Unix-based systems (for docker setup).

<br>

## Deployment

### Frontend Setup

1. Navigate to the `frontend` folder:

   ```bash
   cd frontend
   ```

2. Install the required dependencies:

   ```bash
   npm install
   ```

3. Run the development server:

   ```bash
   npm run dev
   ```

The frontend should now be accessible via `http://localhost:3000` (or a similar port based on your configuration).

<br>

---

<br>

### Backend Setup

The backend is designed to be highly scalable, using **Celery** for image processing tasks. Multiple workers running on different machines can collaborate as long as they can access the same **Redis** instance.

#### Prerequisites

- Install **Docker Desktop** to run the backend via Docker containers.

#### Steps

1. **Prepare Environment Variables:**

   Copy the `.env.copy` file to `.env` and fill in the required information.

   ```bash
   cp .env.copy .env
   ```

2. **Build Docker Containers:**

   Build the Docker containers, which may take some time depending on your internet speed.

   ```bash
   docker-compose build
   ```

3. **Start Docker Containers:**

   Once the containers are built, start them to run all required services:

   ```bash
   docker-compose up
   ```

   By default, the FastAPI backend will be accessible at `http://localhost:8000`.
   **Flower** will be accessible at `http://localhost:5555` for monitoring Celery workers.

<br>

#### Celery Worker Configuration

Celery workers are an integral part of this system. For a basic demo setup, use 1 worker for each type of task. Ensure that the Celery workers and FastAPI can access the same Redis instance for operation.

<br>

## Notes

- **Local Deployment:** The provided Docker setup is intended for local development. For a production or more scalable deployment, you will need to adjust the Docker configuration in `docker-compose.yml` for your specific environment needs.

- **Scaling:** For a scalable production environment, consider using multiple machines and scaling Celery workers. Ensure that all machines can access the same Redis instance for coordination and task routing.
