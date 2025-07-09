import os
import sys
import unittest
from unittest.mock import patch

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app, db

class TestE2E(unittest.TestCase):
    def setUp(self):
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['TESTING'] = True
        app.config['SECRET_KEY'] = 'test'
        with app.app_context():
            db.create_all()
        self.client = app.test_client()

    @patch('data_collector.fetch_air_quality')
    @patch('app.socketio.emit')
    def test_search_and_history(self, mock_emit, mock_fetch):
        from datetime import datetime
        mock_fetch.return_value = (75, 22, 0.6, 20, datetime.now())
        resp = self.client.get('/search?city=DemoCity')
        self.assertEqual(resp.status_code, 200)
        hist_resp = self.client.get('/data/history/DemoCity?hours=1')
        self.assertIn(hist_resp.status_code, [200, 400])

if __name__ == '__main__':
    unittest.main()
