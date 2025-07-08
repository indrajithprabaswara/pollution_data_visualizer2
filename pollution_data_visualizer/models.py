from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class AirQualityData(db.Model):
    __tablename__ = 'air_quality_data'

    id = db.Column(db.Integer, primary_key=True)
    city = db.Column(db.String(80), nullable=False)
    aqi = db.Column(db.Integer, nullable=False)
    pm25 = db.Column(db.Float)
    co = db.Column(db.Float)
    no2 = db.Column(db.Float)
    timestamp = db.Column(db.DateTime, nullable=False)

    def __init__(self, city, aqi, timestamp, pm25=None, co=None, no2=None):
        self.city = city
        self.aqi = aqi
        self.pm25 = pm25
        self.co = co
        self.no2 = no2
        self.timestamp = timestamp
