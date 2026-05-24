FROM python:3.10-slim

RUN apt-get update && apt-get install -y g++ make && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . /app

RUN g++ -O3 -shared -fPIC -o src_core/physics_engine.so src_core/physics_engine.cpp

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8080

CMD ["python", "backend/server_app.py"]