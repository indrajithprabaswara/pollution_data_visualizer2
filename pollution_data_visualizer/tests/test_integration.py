import os
import sys
import unittest
from unittest.mock import patch

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app, db
from models import AirQualityData

class TestIntegration(unittest.TestCase):
    def setUp(self):
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['TESTING'] = True
        app.config['SECRET_KEY'] = 'test'
        with app.app_context():
            db.create_all()
        self.client = app.test_client()

    @patch('data_collector.fetch_air_quality')
    def test_full_flow(self, mock_fetch):
        from datetime import datetime
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
        from datetime import datetime
        mock_fetch.return_value = (60, 11, 0.3, 12, datetime.now())
        first = self.client.get('/data/CachedCity')
        self.assertEqual(first.status_code, 200)
        second = self.client.get('/data/CachedCity')
        self.assertEqual(second.status_code, 200)
        self.assertEqual(mock_fetch.call_count, 1)

if __name__ == '__main__':
    unittest.main()
