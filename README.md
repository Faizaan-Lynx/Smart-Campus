# Smart-Campus
The Smart-Campus system developed by Lynx InfoSec

Before building/pulling, ensure the following two commands have been run:

```bash
git config --global core.autocrlf false
git config --global core.eol lf
```

This will make line-endings match those for unix systems, if using docker.

<br>

## Deployment

To run the frontend, navigate to the frontend folder and run:

```bash
npm install
```

Followed by:

```bash
npm run dev
```

<br>
<br>

To run the backend, Docker Desktop will be needed for easiest setup. First, fill out a .env file with all required information (from .env.copy).

Then, build the docker containers. This can take a while depending on internet speed.

```bash
docker-compose build
```

Next, start the docker containers so that all services can run:

```bash
docker-compose up
```

With the default configuration, FastAPI requests will be accepted at localhost:8000.