# Smart-Campus
The Smart-Campus system developed by Lynx InfoSec

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

To run the backend, first create a database named "tian" in PostgreSQL Database. Next, run the following python command in backend folder:

```python
uvicorn main:app --reload
```

Also ensure PyTorch with GPU capabilities has been installed onto the system/venv.