from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class AirQualityData(db.Model):
    __tablename__ = 'air_quality_data'

    id = db.Column(db.Integer, primary_key=True)
    city = db.Column(db.String(80), nullable=False)
    aqi = db.Column(db.Integer, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False)

    def __init__(self, city, aqi, timestamp):
        self.city = city
        self.aqi = aqi
        self.timestamp = timestamp
