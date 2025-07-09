import os
import sys
import unittest
from unittest.mock import patch

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app, db
from models import User
from werkzeug.security import generate_password_hash

class TestE2E(unittest.TestCase):
    def setUp(self):
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['TESTING'] = True
        app.config['SECRET_KEY'] = 'test'
        with app.app_context():
            db.create_all()
            user = User(username='demo', password=generate_password_hash('demo'))
            db.session.add(user)
            db.session.commit()
        self.client = app.test_client()

    @patch('data_collector.fetch_air_quality')
    @patch('app.socketio.emit')
    def test_search_and_favorite(self, mock_emit, mock_fetch):
        from datetime import datetime
        mock_fetch.return_value = (75, 22, 0.6, 20, datetime.now())
        # login
        self.client.post('/login', data={'username': 'demo', 'password': 'demo'})
        # search city
        resp = self.client.get('/search?city=DemoCity')
        self.assertEqual(resp.status_code, 200)
        # add favorite
        fav_resp = self.client.post('/api/favorites', json={'city': 'DemoCity'})
        self.assertEqual(fav_resp.status_code, 200)
        data = fav_resp.get_json()
        self.assertEqual(data['status'], 'saved')
        list_resp = self.client.get('/api/favorites')
        self.assertEqual(list_resp.status_code, 200)
        cities = [f['city'] for f in list_resp.get_json()['favorites']]
        self.assertIn('DemoCity', cities)

if __name__ == '__main__':
    unittest.main()
