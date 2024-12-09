# read the doc: https://huggingface.co/docs/hub/spaces-sdks-docker
# you will also find guides on how best to write your Dockerfile

FROM python:3.10

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

RUN useradd -m -u 1000 user
USER user

ENV HOME=/home/user \
	PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

COPY --chown=user . $HOME/app

RUN --mount=type=secret,id=SECRET_KEY,mode=0444,required=true
RUN --mount=type=secret,id=ALGORITHM,mode=0444,required=true
RUN --mount=type=secret,id=ACCESS_TOKEN_EXPIRE_MINUTES,mode=0444,required=true
RUN --mount=type=secret,id=DB_SQLITE,mode=0444,required=true
RUN --mount=type=secret,id=SU_NAME,mode=0444,required=true
RUN --mount=type=secret,id=SU_PASSWORD,mode=0444,required=true
RUN --mount=type=secret,id=EZV_KEY,mode=0444,required=true
RUN --mount=type=secret,id=EZV_SECRET,mode=0444,required=true

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
