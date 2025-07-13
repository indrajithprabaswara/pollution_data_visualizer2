import os
import sys
import unittest
import warnings
from unittest.mock import patch
from datetime import datetime, timedelta

warnings.filterwarnings('ignore')

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app, db
from models import AirQualityData
import data_collector

class TestIntegration(unittest.TestCase):
    def setUp(self):
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['TESTING'] = True
        app.config['SECRET_KEY'] = 'test'
        with app.app_context():
            db.create_all()
        self.client = app.test_client()

    def tearDown(self):
        with app.app_context():
            db.session.remove()
            db.drop_all()

    @patch('data_collector.fetch_air_quality')
    def test_full_flow(self, mock_fetch):
        with patch('app.scheduled_collection'):
            mock_fetch.return_value = (50, 12, 0.4, 14, datetime.now())
            resp = self.client.get('/data/Testville')
            self.assertEqual(resp.status_code, 200)
            data = resp.get_json()
            self.assertEqual(data['aqi'], 50)
            hist_resp = self.client.get('/data/history/Testville?hours=1')
            history = hist_resp.get_json()
            self.assertEqual(len(history), 1)
            self.assertEqual(history[0]['aqi'], 50)

    @patch('data_collector.fetch_air_quality')
    def test_caching(self, mock_fetch):
        with patch('app.scheduled_collection'):
            mock_fetch.return_value = (60, 11, 0.3, 12, datetime.now() - timedelta(minutes=1))
            first = self.client.get('/data/CachedCity')
            self.assertEqual(first.status_code, 200)
            second = self.client.get('/data/CachedCity')
            self.assertEqual(second.status_code, 200)
            self.assertEqual(mock_fetch.call_count, 1)

    @patch('app.collect_data')
    def test_persistence(self, mock_app_collect_data):
        with patch('app.scheduled_collection'):
            def immediate_data_save(city, max_age_minutes=None):
                aqi, pm25, co, no2, ts = (42, 10, 0.5, 15, datetime.now())
                data_collector.save_air_quality_data(city, aqi, pm25, co, no2, ts)

            mock_app_collect_data.side_effect = immediate_data_save

            self.client.get('/data/PersistTown')
            with app.app_context():
                first_count = AirQualityData.query.filter_by(city='PersistTown').count()
            self.assertEqual(first_count, 1)

            def immediate_data_save_second(city, max_age_minutes=None):
                aqi, pm25, co, no2, ts = (45, 11, 0.6, 18, datetime.now() + timedelta(minutes=1))
                data_collector.save_air_quality_data(city, aqi, pm25, co, no2, ts)

            mock_app_collect_data.side_effect = immediate_data_save_second

            self.client.get('/data/PersistTown')
            with app.app_context():
                second_count = AirQualityData.query.filter_by(city='PersistTown').count()
            self.assertEqual(second_count, 2)

if __name__ == '__main__':
    unittest.main()
