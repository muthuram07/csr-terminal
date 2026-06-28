FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for scikit-learn and python-Levenshtein
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY . .

EXPOSE 5004

# Use gunicorn for production with 2 workers
CMD ["gunicorn", "--bind", "0.0.0.0:5004", "--workers", "2", "--timeout", "120", "enhanced_api:app", "--preload"]
