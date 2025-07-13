FROM python:3.9-slim
WORKDIR /app
COPY pollution_data_visualizer/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8080
CMD ["python", "pollution_data_visualizer/app.py"]
