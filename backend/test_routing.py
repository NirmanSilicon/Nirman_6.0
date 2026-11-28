import sys
import os
import unittest
from flask import Flask

# Add parent directory to path to allow absolute imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, mongo
from app.services.map_service import map_service

class TestRoutingAndRecommendation(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app_context = self.app.app_context()
        self.app_context.push()
        
    def tearDown(self):
        self.app_context.pop()

    def test_haversine_distance(self):
        # SUM Hospital (20.28, 85.78) to Capital Hospital (20.27, 85.83)
        dist = map_service.haversine_distance(20.28, 85.78, 20.27, 85.83)
        print(f"\nHaversine Distance: {dist} km")
        self.assertTrue(1.0 < dist < 10.0)

    def test_osrm_detailed_route(self):
        # Route SUM to Capital
        route_data = map_service.get_detailed_route(20.28, 85.78, 20.27, 85.83, crowd_level='High')
        print("\nOSRM Route Data:")
        print(f"Success: {route_data.get('success')}")
        print(f"Distance: {route_data.get('distance_km')} km")
        print(f"Duration with Traffic: {route_data.get('duration_with_traffic_mins')} mins")
        print(f"Traffic level: {route_data.get('traffic_level')}")
        print(f"Steps count: {len(route_data.get('steps', []))}")
        
        self.assertTrue(route_data.get('distance_km') > 0)
        self.assertTrue(len(route_data.get('steps', [])) > 0)
        self.assertIn('route_geometry', route_data)

    def test_osrm_table_enrichment(self):
        hospitals = [
            {'hospital_id': 'H-001', 'name': 'SUM Hospital', 'location': {'lat': 20.28, 'lng': 85.78}, 'crowd_level': 'High'},
            {'hospital_id': 'H-002', 'name': 'AIIMS', 'location': {'lat': 20.23, 'lng': 85.77}, 'crowd_level': 'Very High'},
            {'hospital_id': 'H-003', 'name': 'Capital', 'location': {'lat': 20.27, 'lng': 85.83}, 'crowd_level': 'Low'}
        ]
        
        enriched = map_service.enrich_hospitals_with_routing(20.28, 85.78, hospitals)
        print("\nEnriched Table Data:")
        for h in enriched:
            print(f"{h['name']}: Road Distance {h.get('distance_km')} km, Travel Time {h.get('traffic_info', {}).get('duration_with_traffic_mins')} mins, Traffic {h.get('traffic_info', {}).get('traffic_level')}")
            self.assertIn('distance_km', h)
            self.assertIn('traffic_info', h)

    def test_ai_recommendation_with_routing(self):
        # Run recommendation for 'ENT' with user coordinates after create_app has initialized mongo
        from app.ai.recommendation_engine import recommendation_engine
        recs = recommendation_engine.recommend('ENT', user_lat=20.28, user_lng=85.78)
        print("\nAI Recommendation Rankings (with OSRM):")
        for idx, r in enumerate(recs, 1):
            print(f"{idx}. {r['name']} (Score: {r['ai_score']}, Dist: {r['distance']} km, Queue: {r['queue_length']}, Wait: {r['queue_wait_mins']}m, Travel: {r['travel_time_mins']}m)")
            
        self.assertTrue(len(recs) > 0)
        self.assertTrue('ai_score' in recs[0])
        self.assertTrue('travel_time_mins' in recs[0])

if __name__ == '__main__':
    unittest.main()
