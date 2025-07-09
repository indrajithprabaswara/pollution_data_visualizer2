import os

class Config:
    # Use your AQICN API Key
    API_KEY = 'da422a944c1edaa853351550b87c87b02b7563ab'
    BASE_URL = 'https://api.waqi.info/feed/{}/?token=' + API_KEY

    # Cache duration in minutes for API responses
    FETCH_CACHE_MINUTES = 30
    
    # Database Configuration (For Local Testing, PostgreSQL can be hosted on Heroku)
    # Use a lightweight SQLite database by default for easier local setup.
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///pollution.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
