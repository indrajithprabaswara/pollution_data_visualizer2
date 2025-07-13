import unittest
import time
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from events import publish_event, get_queue

class TestEvents(unittest.TestCase):
    def test_publish_and_consume(self):
        received = []
        q = get_queue()
        size_before = q.qsize()
        publish_event('test', {'value': 1})
        self.assertEqual(q.qsize(), size_before + 1)
        evt = q.get_nowait()
        self.assertEqual(evt['type'], 'test')
        q.task_done()

if __name__ == '__main__':
    unittest.main()
