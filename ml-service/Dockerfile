FROM python:3.11-slim

WORKDIR /app

# Install libgomp (required by LightGBM)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code and pre-trained models
COPY . .

# Railway injects PORT at runtime
ENV ML_MODEL_DIR=./models
ENV ML_DATA_DIR=./data
ENV TRAINING_ENABLED=false

EXPOSE 8000

CMD ["python", "main.py"]
