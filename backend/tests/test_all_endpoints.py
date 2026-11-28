# -*- coding: utf-8 -*-
import os, sys, unittest

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PROJECT_ROOT = os.path.abspath(os.path.join(BACKEND_DIR, '..'))
for p in [PROJECT_ROOT, BACKEND_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from rest_framework.test import APIClient
from rest_framework import status

class TestAllAPIEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = APIClient()

    def test_01_incident_generate(self):
        res = self.client.post('/api/incidents/generate/', {
            'duration_seconds': 60, 'cascade_offset_s': 20,
            'scenario_key': 'thermal_sensor', 'scenario_source': 'synthetic'
        }, format='json')
        self.assertIn(res.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        data = res.json()
        self.assertIn('incident_id', data)
        self.assertIn('events', data)
        TestAllAPIEndpoints.last_incident_id = data['incident_id']

    def test_02_incident_list(self):
        res = self.client.get('/api/incidents/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsInstance(res.json(), list)

    def test_03_incident_detail(self):
        inc_id = getattr(self.__class__, 'last_incident_id', 'inc_001')
        res = self.client.get(f'/api/incidents/{inc_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_04_incident_upload(self):
        payload = {'records': [{'timestamp': '2026-08-20T08:04:00Z', 'component': 'thermal_sensor', 'parameter': 'temperature', 'value': -999.0}]}
        res = self.client.post('/api/incidents/upload/', payload, format='json')
        self.assertIn(res.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

    def test_05_incident_analyze(self):
        inc_id = getattr(self.__class__, 'last_incident_id', 'inc_001')
        res = self.client.post(f'/api/incidents/{inc_id}/analyze/', {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('nodes', res.json())
        self.assertIn('edges', res.json())

    def test_06_query_counterfactual(self):
        inc_id = getattr(self.__class__, 'last_incident_id', 'inc_001')
        inc_res = self.client.get(f'/api/incidents/{inc_id}/')
        events = inc_res.json().get('events', [])
        target_evt = events[0]['id'] if events else 'evt-thm-001'
        res = self.client.post('/api/query/counterfactual/', {'incident_id': inc_id, 'target_event_id': target_evt}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_07_query_blast_radius(self):
        res = self.client.get('/api/query/blast-radius/?component=thermal_sensor&max_hops=3')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.json()['component'], 'thermal_sensor')

    def test_08_caelis_score(self):
        payload = {'values': [0.11, 0.12, 4.85, 5.20, 4.91, 5.10, 4.80, 0.13, 0.12, 0.11], 'component': 'thermal_sensor'}
        res = self.client.post('/api/caelis/score/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.json()['status'], 'success')
        self.assertTrue(res.json()['event']['is_anomaly'])

    def test_09_caelis_validate(self):
        res = self.client.post('/api/caelis/validate/', {'event_id': 'evt-thm-001', 'incident_id': 'inc_001'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_10_caelis_scenarios(self):
        res = self.client.get('/api/caelis/scenarios/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        scenarios = res.json().get('scenarios', [])
        keys = [s.get('scenario_key') for s in scenarios]
        self.assertIn('capstone_2022', keys)
        self.assertIn('dellingr_2017', keys)

    def test_11_feedback_submit(self):
        payload = {'incident_id': 'inc_001', 'event_id': 'evt-01', 'component': 'thermal_sensor', 'engineer_verdict': 'confirmed'}
        res = self.client.post('/api/feedback/submit/', payload, format='json')
        self.assertIn(res.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

    def test_12_feedback_stats(self):
        res = self.client.get('/api/feedback/stats/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIn('total', data)
        self.assertIn('confirmed', data)

    def test_13_feedback_history(self):
        res = self.client.get('/api/feedback/history/?limit=10')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_14_feedback_trigger_retrain_dry_run(self):
        res = self.client.post('/api/feedback/trigger-retrain/', {'min_records': 1, 'dry_run': True}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_15_export_report(self):
        res = self.client.get('/api/reports/inc_001/export/?format=json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('summary', res.json())
        self.assertIn('evidence_trace', res.json())

    def test_16_next_best_evidence(self):
        res = self.client.post('/api/incidents/inc_001/next-best-evidence/', {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIn('recommended_observation', data)
        self.assertIn('target_signal', data)
        self.assertIn('expected_outcomes', data)
        self.assertIn('expected_information_gain', data)

    def test_17_scenarios_alias(self):
        res = self.client.get('/api/scenarios/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_18_canonical_analysis_fields(self):
        res = self.client.post('/api/incidents/inc_001/analyze/', {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIn('status', data)
        self.assertIn('next_best_evidence', data)
        self.assertIn('hypotheses', data)
        self.assertIn('cascade', data)
        self.assertIn('provenance', data)
        self.assertIn('sha256', data['provenance'])

if __name__ == '__main__':
    unittest.main()

