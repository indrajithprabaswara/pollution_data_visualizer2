FROM python:3.9-slim
WORKDIR /app
COPY pollution_data_visualizer/requirements.txt .
RUN apt-get update && apt-get install -y libpq-dev gcc && pip install --no-cache-dir -r requirements.txt && apt-get remove -y gcc && apt-get -y autoremove && rm -rf /var/lib/apt/lists/*
COPY . .
EXPOSE 8080
CMD ["python", "pollution_data_visualizer/app.py"]
