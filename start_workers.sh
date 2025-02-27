#!/bin/bash

WORKER_COUNT=${1:-3}
echo "Scaling Celery workers to $WORKER_COUNT..."

celery_mod=${CELERY_MODULE:-3}

for i in $(seq 1 $WORKER_COUNT); do
  WORKER_NAME="worker$i"

  export WORKER_NAME

  echo "Starting worker: $WORKER_NAME"
  celery -A ${celery_mod}.celery_app worker -n $WORKER_NAME --loglevel=info &

  sleep 1
done

wait