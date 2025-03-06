#!/bin/bash

WORKER_COUNT=${1:-3}
echo "Scaling Celery workers to $WORKER_COUNT..."

celery_mod=${CELERY_MODULE:-3}

for i in $(seq 1 $WORKER_COUNT); do
  WORKER_NAME="worker$i"

  # export WORKER_NAME

  echo "Starting worker: $WORKER_NAME"
  celery -A ${celery_mod}.worker.celery_app worker -n $WORKER_NAME -Q general_tasks --loglevel=info &

  sleep 0.5

done


# feed workers start up
FEED_WORKERS=${2:-3}
echo "Scaling Feed workers to $FEED_WORKERS..."

for i in $(seq 1 $FEED_WORKERS); do
  WORKER_NAME="feed_worker$i"

  # export WORKER_NAME

  echo "Starting worker: $WORKER_NAME"
  celery -A ${celery_mod}.feed_worker.feed_worker_app worker -n $WORKER_NAME -Q feed_tasks --loglevel=info &

  sleep 0.5

done


MODEL_WORKERS=${3:-3}
echo "Scaling Model workers to $MODEL_WORKERS..."

for i in $(seq 1 $MODEL_WORKERS); do
  WORKER_NAME="model_worker$i"

  export WORKER_NAME

  echo "Starting worker: $WORKER_NAME"
  celery -A ${celery_mod}.model_worker.celery_app worker -n $WORKER_NAME -Q model_tasks --loglevel=info &

  sleep 0.5

done

wait