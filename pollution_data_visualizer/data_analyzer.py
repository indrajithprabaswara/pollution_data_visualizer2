from models import AirQualityData
from datetime import datetime

# Function to calculate average AQI for a given city between specific date ranges
def get_average_aqi(city, start_date, end_date):
    data = AirQualityData.query.filter(AirQualityData.city == city,
                                       AirQualityData.timestamp >= start_date,
                                       AirQualityData.timestamp <= end_date).all()

    if not data:
        return None

    total_aqi = sum([record.aqi for record in data])
    return total_aqi / len(data)

# Function to get the most recent AQI for a given city
def get_recent_aqi(city):
    data = AirQualityData.query.filter(AirQualityData.city == city).order_by(AirQualityData.timestamp.desc()).first()
    return data.aqi if data else None
