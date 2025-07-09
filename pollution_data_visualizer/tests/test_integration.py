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

    @patch('data_collector.fetch_air_quality')
    def test_persistence(self, mock_fetch):
        from datetime import datetime, timedelta
        from unittest.mock import patch as p
        import data_collector

        t = datetime.now()
        mock_fetch.return_value = (42, 10, 0.5, 15, t)

        def immediate(city):
            aqi, pm25, co, no2, ts = mock_fetch.return_value
            data_collector.save_air_quality_data(city, aqi, pm25, co, no2, ts)

        with p('app.collect_data', side_effect=immediate):
            self.client.get('/data/PersistTown')
            with app.app_context():
                first = AirQualityData.query.filter_by(city='PersistTown').count()
            self.assertEqual(first, 1)

            mock_fetch.return_value = (45, 11, 0.6, 18, t + timedelta(minutes=1))
            self.client.get('/data/PersistTown')
            with app.app_context():
                second = AirQualityData.query.filter_by(city='PersistTown').count()
            self.assertEqual(second, 2)

if __name__ == '__main__':
    unittest.main()
