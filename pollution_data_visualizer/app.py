from flask import Flask, render_template, jsonify, request, redirect, url_for, session
from flask_socketio import SocketIO
from prometheus_client import Counter, Gauge, generate_latest
from events import publish_event, start_consumer
from config import Config
from models import db, AirQualityData
from data_collector import collect_data, collect_data_for_multiple_cities
from data_analyzer import get_average_aqi, get_recent_aqi, get_aqi_history
from models import User, FavoriteCity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler

monitored_cities = ['New York', 'Los Angeles', 'San Francisco']

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)
socketio = SocketIO(app, async_mode='threading')

# Prometheus metrics
REQUEST_COUNT = Counter('request_count', 'Total HTTP requests', ['method', 'endpoint'])
AQI_GAUGE = Gauge('stored_aqi_records', 'Number of AQI records in the database')

# simple event consumer logs events
def _log_event(event):
    app.logger.info('event: %s', event)

start_consumer(_log_event)

@app.before_request
def before_request_func():
    REQUEST_COUNT.labels(request.method, request.path).inc()

@app.after_request
def after_request_func(response):
    AQI_GAUGE.set(AirQualityData.query.count())
    return response

scheduler = BackgroundScheduler()

def scheduled_collection():
    with app.app_context():
        for city in monitored_cities:
            try:
                collect_data(city)
                history = get_aqi_history(city, hours=1)
                if history:
                    socketio.emit('update', {'city': city, **history[-1]}, broadcast=True)
                    publish_event('aqi_collected', {'city': city, 'aqi': history[-1]['aqi']})
            except Exception as e:
                app.logger.warning("Failed to collect data for %s: %s", city, e)


@app.before_first_request
def setup_database():
    """Ensure database tables exist and start scheduler."""
    db.create_all()
    if not User.query.first():
        # create a default user for simplicity
        user = User(username='demo', password=generate_password_hash('demo'))
        db.session.add(user)
        db.session.commit()
    scheduler.add_job(scheduled_collection, 'interval', minutes=30, id='aqi_job')
    scheduler.start()
    scheduled_collection()

@app.route('/')
def index():
    """Render the main interface."""
    return render_template('index.html')

# Simple about page
@app.route('/about')
def about():
    return render_template('about.html')

# User profile page to manage saved cities and alert thresholds
@app.route('/profile')
def profile():
    """Display the profile page which manages favorite cities client side."""
    return render_template('profile.html')

# Route to get real-time data for a specific city
@app.route('/data/<city>')
def get_city_data(city):
    try:
        collect_data(city)  # Collect the latest data
        history = get_aqi_history(city, hours=1)
        if not history:
            return jsonify({"error": "No data"}), 404
        latest = history[-1]
        return jsonify(latest)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Route to get AQI history
@app.route('/data/history/<city>')
def get_city_history(city):
    try:
        hours = int(request.args.get('hours', 24))
        history = get_aqi_history(city, hours=hours)
        return jsonify(history)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Return history for multiple cities
@app.route('/data/history_multi')
def get_history_multi():
    try:
        cities = request.args.getlist('city')
        hours = int(request.args.get('hours', 24))
        result = {}
        for city in cities:
            result[city] = get_aqi_history(city, hours=hours)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Route to get the average AQI for a city in the past 7 days
@app.route('/data/average/<city>')
def get_average(city):
    try:
        start_date = datetime.now() - timedelta(days=7)
        average_aqi = get_average_aqi(city, start_date, datetime.now())
        return jsonify({"city": city, "average_aqi": average_aqi})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Route to handle search requests
@app.route('/search', methods=['GET'])
def search():
    city = request.args.get('city')
    if city:
        collect_data(city)  # Collect new data for the city
        if city not in monitored_cities:
            monitored_cities.append(city)
        history = get_aqi_history(city, hours=1)
        if history:
            socketio.emit('update', {'city': city, **history[-1]}, broadcast=True)
        publish_event('search_city', {'city': city})
        recent_aqi = get_recent_aqi(city)
        return render_template('index.html', city=city, aqi=recent_aqi)
    return render_template('index.html', error="City not found!")

# Collect data for multiple cities (could be triggered on a schedule or manually)
@app.route('/collect_data_for_multiple')
def collect_data_multiple():
    cities = ['New York', 'Los Angeles', 'Chicago', 'San Francisco', 'Houston', 'Beijing', 'London']
    collect_data_for_multiple_cities(cities)
    return jsonify({"status": "Data collection for multiple cities is complete!"})

# Provide a summary of average AQI for a list of cities
@app.route('/api/summary')
def api_summary():
    cities = request.args.getlist('city') or ['New York', 'Los Angeles', 'Chicago']
    result = {}
    for city in cities:
        start_date = datetime.now() - timedelta(days=1)
        avg = get_average_aqi(city, start_date, datetime.now())
        result[city] = avg
    return jsonify(result)

# Return coordinates for known cities
@app.route('/api/coords/<city>')
def api_coords(city):
    import json, os
    path = os.path.join(os.path.dirname(__file__), 'city_coords.json')
    with open(path) as f:
        coords = json.load(f)
    if city in coords:
        return jsonify({'lat': coords[city][0], 'lon': coords[city][1]})
    return jsonify({'error': 'Unknown city'}), 404

# Expose metrics for monitoring
@app.route('/metrics')
def metrics():
    return generate_latest(), 200, {'Content-Type': 'text/plain'}

if __name__ == "__main__":
    socketio.run(app, debug=True)
