import os
import joblib
import pandas as pd
from app.models.queue import Queue

class RecommendationEngine:
    def __init__(self, model_path=None):
        if model_path is None:
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
            self.model_path = os.path.join(base_dir, 'trained_models', 'recommendation_model.joblib')
        else:
            self.model_path = model_path
        self.model = None
        self.load_model()
        
    def load_model(self):
        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
                print(f"Loaded hospital recommendation model from {self.model_path}")
            except Exception as e:
                print(f"Failed to load recommendation model: {e}")
                self.model = None
                
    def get_crowd_level_val(self, level):
        levels = {'low': 0, 'medium': 1, 'high': 2, 'very high': 3}
        return levels.get(str(level).lower(), 1)
        
    def calculate_distance(self, user_lat, user_lng, hosp_location):
        if not user_lat or not user_lng or not hosp_location:
            return 5.0 # default distance in km
            
        h_lat = hosp_location.get('lat', 20.27)
        h_lng = hosp_location.get('lng', 85.82)
        
        # Simple Euclidean approximation for local distance (1 degree is ~111km)
        lat_diff = (user_lat - h_lat) * 111.0
        lng_diff = (user_lng - h_lng) * 111.0
        return float(round((lat_diff**2 + lng_diff**2)**0.5, 2))
        
    def recommend(self, department, user_lat=None, user_lng=None):
        if not self.model:
            self.load_model()
            
        from app import mongo
        hospitals = list(mongo.db.hospitals.find({}))
        if not hospitals:
            return []
            
        # Enrich hospitals with OSRM road distance and travel durations if user location is available
        if user_lat is not None and user_lng is not None:
            try:
                from app.services.map_service import map_service
                hospitals = map_service.enrich_hospitals_with_routing(user_lat, user_lng, hospitals)
            except Exception as e:
                print(f"Error enriching recommendation hospitals: {e}")
            
        recommendations = []
        for hosp in hospitals:
            hosp_id = hosp.get('hospital_id')
            
            # 1. Distance & Travel Time
            if user_lat is not None and user_lng is not None:
                distance = hosp.get('distance_km', self.calculate_distance(user_lat, user_lng, hosp.get('location', {})))
                traffic_info = hosp.get('traffic_info', {})
                travel_time = traffic_info.get('duration_with_traffic_mins', distance * 1.5 + 2)
                traffic_level = traffic_info.get('traffic_level', 'Normal')
            else:
                distance = 5.0 # default distance
                travel_time = 10.0 # default travel time
                traffic_level = 'Normal'
            
            # 2. Rating
            rating = hosp.get('rating', 3.5)
            
            # 3. Queue Length
            queue = Queue.get_queue(hosp_id, department)
            queue_length = queue.get('total_in_queue', 0)
            current_serving = queue.get('current_serving', 0)
            avg_time = queue.get('avg_time_per_patient', 10)
            
            # Calculate wait time in mins
            people_ahead = max(0, queue_length - current_serving)
            predicted_wait = people_ahead * avg_time
            
            # 4. Crowd level
            crowd_level = self.get_crowd_level_val(hosp.get('crowd_level', 'Medium'))
            
            # 5. Doctor Experience
            dept_docs = [doc for doc in hosp.get('doctors', []) if doc.get('specialty', '').lower() == department.lower()]
            avg_exp = 10.0 # Default
            if dept_docs:
                # Mock experience if not provided, else take average
                exps = [float(doc.get('experience', 10.0)) for doc in dept_docs]
                avg_exp = sum(exps) / len(exps)
                
            # 6. Availability (Number of doctors in the department)
            availability = len(dept_docs)
            
            # Predict suitability score
            score = None
            if self.model:
                try:
                    input_df = pd.DataFrame([{
                        'distance': distance,
                        'rating': rating,
                        'queue_length': queue_length,
                        'crowd_level': crowd_level,
                        'doctor_experience': avg_exp,
                        'availability': availability
                    }])
                    score = self.model.predict(input_df)[0]
                except Exception as e:
                    print(f"Error predicting with LightGBM: {e}")
                    score = None
                    
            if score is None:
                # Rule-based fallback score (accounts for travel time with traffic and patient queue wait time)
                score = (rating * 16.0) + (avg_exp * 0.8) + (availability * 6.0)
                score -= (distance * 0.8)
                score -= (travel_time * 0.5)
                score -= (queue_length * 1.2)
                score -= (crowd_level * 4.0)
                score = max(0.0, min(100.0, score))
                
            recommendations.append({
                'hospital_id': hosp_id,
                'name': hosp.get('name'),
                'logo': hosp.get('logo', ''),
                'address': hosp.get('address', ''),
                'location': hosp.get('location', {}),
                'distance': distance,
                'travel_time_mins': travel_time,
                'traffic_level': traffic_level,
                'rating': rating,
                'queue_length': queue_length,
                'queue_wait_mins': predicted_wait,
                'crowd_level': hosp.get('crowd_level', 'Medium'),
                'avg_experience': round(avg_exp, 1),
                'available_doctors': availability,
                'ai_score': round(float(score), 2),
                'specialties': hosp.get('specialties', [])
            })
            
        # Sort by score descending
        recommendations = sorted(recommendations, key=lambda x: x['ai_score'], reverse=True)
        return recommendations

# Single global instance
recommendation_engine = RecommendationEngine()
