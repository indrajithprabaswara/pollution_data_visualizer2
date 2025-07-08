import os

class Config:
    # Use your AQICN API Key
    API_KEY = 'c08edb637332856d22941f390ab5dcf64062499a'
    BASE_URL = 'https://api.waqi.info/feed/{}/?token=' + API_KEY
    
    # Database Configuration (For Local Testing, PostgreSQL can be hosted on Heroku)
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'postgresql://localhost/pollution_db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
