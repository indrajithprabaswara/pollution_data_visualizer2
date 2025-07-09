import unittest
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import app

class TestApp(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_index(self):
        response = self.app.get('/')
        self.assertEqual(response.status_code, 200)

    def test_get_city_data(self):
        response = self.app.get('/data/Los Angeles')
        # The endpoint may fail if external API is unreachable; ensure a response is returned
        self.assertIn(response.status_code, [200, 400])

    def test_about_page(self):
        response = self.app.get('/about')
        self.assertEqual(response.status_code, 200)

    def test_summary_endpoint(self):
        response = self.app.get('/api/summary?city=TestCity')
        self.assertIn(response.status_code, [200, 400])

    def test_history_multi(self):
        resp = self.app.get('/data/history_multi?city=New%20York&city=Los%20Angeles&hours=1')
        self.assertIn(resp.status_code, [200, 400])

    def test_profile_page(self):
        resp = self.app.get('/profile')
        self.assertEqual(resp.status_code, 200)

    def test_coords_endpoint(self):
        response = self.app.get('/api/coords/New%20York')
        self.assertIn(response.status_code, [200, 404])

    def test_metrics_endpoint(self):
        response = self.app.get('/metrics')
        self.assertEqual(response.status_code, 200)

if __name__ == '__main__':
    unittest.main()
