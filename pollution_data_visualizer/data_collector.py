import requests
from config import Config
from datetime import datetime
from models import db, AirQualityData

# Function to fetch air quality data from AQICN API
def fetch_air_quality(city):
    url = Config.BASE_URL.format(city)
    response = requests.get(url)
    data = response.json()

    # Check if API response status is OK
    if data.get("status") == "ok":
        aqi = data["data"]["aqi"]
        timestamp = datetime.now()
        return aqi, timestamp
    else:
        raise Exception(f"Failed to fetch data for {city}. Error: {data.get('data', {}).get('error', 'Unknown error')}")
        
# Function to save the collected data to the database
def save_air_quality_data(city, aqi, timestamp):
    air_quality_data = AirQualityData(city=city, aqi=aqi, timestamp=timestamp)
    db.session.add(air_quality_data)
    db.session.commit()

# Function to collect data for a specific city
def collect_data(city):
    aqi, timestamp = fetch_air_quality(city)
    save_air_quality_data(city, aqi, timestamp)

# Collect data for multiple cities
def collect_data_for_multiple_cities(cities):
    for city in cities:
        try:
            collect_data(city)
        except Exception as e:
            print(f"Error collecting data for {city}: {e}")
