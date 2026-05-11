FROM python:3.10-slim

WORKDIR /app

# Copy requirements và cài đặt
COPY requirements.txt .

RUN pip install --upgrade pip
RUN pip install --default-timeout=1000 --no-cache-dir -r requirements.txt

# Copy toàn bộ source code
COPY . .

EXPOSE 8000

# Chạy server FastAPI
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]