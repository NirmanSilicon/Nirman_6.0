import requests
import math
import datetime
import random

class MapService:
    def __init__(self):
        self.osrm_base_url = "https://router.project-osrm.org"
        
    def haversine_distance(self, lat1, lon1, lat2, lon2):
        """
        Calculate straight-line distance in km between two coordinate points
        """
        try:
            R = 6371.0 # Earth radius in km
            d_lat = math.radians(float(lat2) - float(lat1))
            d_lon = math.radians(float(lon2) - float(lon1))
            a = (math.sin(d_lat / 2) ** 2 +
                 math.cos(math.radians(float(lat1))) * math.cos(math.radians(float(lat2))) *
                 math.sin(d_lon / 2) ** 2)
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            return round(R * c, 2)
        except Exception:
            return 5.0

    def get_detailed_route(self, start_lat, start_lng, dest_lat, dest_lng, crowd_level='Low'):
        """
        Call OSRM to get detailed driving coordinates, distance, duration, steps and calculate traffic duration.
        """
        url = f"{self.osrm_base_url}/route/v1/driving/{start_lng},{start_lat};{dest_lng},{dest_lat}?overview=full&geometries=geojson&steps=true"
        try:
            res = requests.get(url, timeout=5)
            if res.status_code == 200:
                data = res.json()
                if data.get('code') == 'Ok' and data.get('routes'):
                    route = data['routes'][0]
                    distance_km = round(route['distance'] / 1000.0, 2)
                    base_duration_sec = route['duration']
                    geometry = route['geometry']
                    
                    # Extract steps/directions
                    steps = []
                    for leg in route.get('legs', []):
                        for step in leg.get('steps', []):
                            name = step.get('name', '')
                            instruction = step.get('maneuver', {}).get('type', '')
                            modifier = step.get('maneuver', {}).get('modifier', '')
                            distance = step.get('distance', 0)
                            
                            dir_text = self._format_step_instruction(instruction, modifier, name, distance)
                            steps.append({
                                'instruction': dir_text,
                                'distance_m': round(distance),
                                'duration_sec': round(step.get('duration', 0))
                            })
                            
                    traffic_info = self.calculate_traffic_and_congestion(base_duration_sec, crowd_level)
                    walking_mins = round((distance_km / 5.0) * 60.0) # standard 5 km/h walking speed
                    
                    return {
                        'success': True,
                        'distance_km': distance_km,
                        'duration_mins': round(base_duration_sec / 60.0, 1),
                        'duration_with_traffic_mins': traffic_info['duration_with_traffic_mins'],
                        'walking_duration_mins': max(1, walking_mins),
                        'traffic_level': traffic_info['traffic_level'],
                        'traffic_multiplier': traffic_info['multiplier'],
                        'route_geometry': geometry,
                        'steps': steps
                    }
            raise Exception("OSRM Route response code not Ok")
        except Exception as e:
            print(f"OSRM Routing Error: {e}. Falling back to straight-line route.")
            # Fallback to straight line route
            dist_km = self.haversine_distance(start_lat, start_lng, dest_lat, dest_lng)
            duration_mins = round(dist_km * 1.5 + 2) # estimation
            traffic_info = self.calculate_traffic_and_congestion(duration_mins * 60, crowd_level)
            walking_mins = round((dist_km / 5.0) * 60.0)
            
            return {
                'success': False,
                'fallback': True,
                'distance_km': dist_km,
                'duration_mins': duration_mins,
                'duration_with_traffic_mins': traffic_info['duration_with_traffic_mins'],
                'walking_duration_mins': max(1, walking_mins),
                'traffic_level': traffic_info['traffic_level'],
                'traffic_multiplier': traffic_info['multiplier'],
                'route_geometry': {
                    'type': 'LineString',
                    'coordinates': [[float(start_lng), float(start_lat)], [float(dest_lng), float(dest_lat)]]
                },
                'steps': [
                    {'instruction': f'Navigate towards destination ({dist_km} km)', 'distance_m': dist_km * 1000, 'duration_sec': duration_mins * 60}
                ]
            }

    def enrich_hospitals_with_routing(self, start_lat, start_lng, hospitals):
        """
        Query OSRM table service to calculate road distances and base durations for multiple hospitals in one HTTP call.
        """
        coords_str = f"{start_lng},{start_lat}"
        valid_hospitals = []
        for h in hospitals:
            loc = h.get('location', {})
            if loc and loc.get('lat') is not None and loc.get('lng') is not None:
                valid_hospitals.append(h)
                
        if not valid_hospitals:
            return hospitals
            
        dest_coords = [f"{h['location']['lng']},{h['location']['lat']}" for h in valid_hospitals]
        url = f"{self.osrm_base_url}/table/v1/driving/{coords_str};{';'.join(dest_coords)}?sources=0&annotations=duration,distance"
        
        try:
            res = requests.get(url, timeout=5)
            if res.status_code == 200:
                data = res.json()
                if data.get('code') == 'Ok':
                    distances = data.get('distances', [[]])[0]
                    durations = data.get('durations', [[]])[0]
                    
                    for idx, h in enumerate(valid_hospitals):
                        # OSRM table format: source is idx 0, dest 1 is idx 1, etc.
                        tbl_idx = idx + 1
                        
                        dist_m = distances[tbl_idx] if tbl_idx < len(distances) else None
                        dur_sec = durations[tbl_idx] if tbl_idx < len(durations) else None
                        
                        if dist_m is not None and dur_sec is not None:
                            h['distance_km'] = round(dist_m / 1000.0, 2)
                            h['duration_mins'] = round(dur_sec / 60.0, 1)
                            traffic_info = self.calculate_traffic_and_congestion(dur_sec, h.get('crowd_level', 'Low'))
                            h['traffic_info'] = traffic_info
                        else:
                            # fallback inside table loop for safety
                            self._apply_fallback_routing(start_lat, start_lng, h)
                    return hospitals
            raise Exception("OSRM Table response code not Ok")
        except Exception as e:
            print(f"OSRM Table Error: {e}. Falling back to Haversine calculations.")
            for h in valid_hospitals:
                self._apply_fallback_routing(start_lat, start_lng, h)
            return hospitals

    def _apply_fallback_routing(self, start_lat, start_lng, hospital):
        dist_km = self.haversine_distance(start_lat, start_lng, hospital['location']['lat'], hospital['location']['lng'])
        hospital['distance_km'] = dist_km
        hospital['duration_mins'] = round(dist_km * 1.5 + 2)
        hospital['traffic_info'] = self.calculate_traffic_and_congestion(hospital['duration_mins'] * 60, hospital.get('crowd_level', 'Low'))

    def calculate_traffic_and_congestion(self, base_duration_sec, crowd_level):
        """
        Compute dynamic traffic adjustments based on:
        1. Hospital crowd levels
        2. Hour of the day (Rush Hour)
        3. Small random fluctuation noise (+/- 5%)
        """
        multiplier = 1.0
        
        # 1. Hospital crowd level impact
        c_lvl = str(crowd_level).lower()
        if c_lvl in ['very high', 'veryhigh']:
            multiplier += 0.45
            traffic_level = 'Heavy'
        elif c_lvl == 'high':
            multiplier += 0.25
            traffic_level = 'Moderate'
        elif c_lvl == 'medium':
            multiplier += 0.1
            traffic_level = 'Light'
        else:
            traffic_level = 'Normal'
            
        # 2. Time-of-day peak congestion
        hour = datetime.datetime.now().hour
        # Peak: 08:00 - 10:30 AM and 05:00 - 08:00 PM
        if (8 <= hour <= 10) or (17 <= hour <= 20):
            multiplier += 0.3
            if traffic_level == 'Normal':
                traffic_level = 'Moderate'
            elif traffic_level == 'Light':
                traffic_level = 'Moderate'
            elif traffic_level == 'Moderate':
                traffic_level = 'Heavy'
            elif traffic_level == 'Heavy':
                traffic_level = 'Gridlock'
                
        # 3. Add random noise for micro-fluctuations
        multiplier += random.uniform(-0.05, 0.05)
        multiplier = max(1.0, multiplier)
        
        duration_with_traffic_sec = base_duration_sec * multiplier
        
        return {
            'duration_with_traffic_mins': max(1.0, round(duration_with_traffic_sec / 60.0, 1)),
            'traffic_level': traffic_level,
            'multiplier': round(multiplier, 2)
        }

    def _format_step_instruction(self, instruction, modifier, street, distance):
        dist_str = f"{round(distance)}m" if distance < 1000 else f"{round(distance/1000, 1)}km"
        
        inst_map = {
            'depart': f"Depart on {street or 'road'}",
            'turn': f"Turn {modifier or ''} onto {street or 'road'}",
            'continue': f"Continue on {street or 'road'}",
            'merge': f"Merge onto {street or 'road'}",
            'on ramp': f"Take the ramp onto {street or 'road'}",
            'off ramp': f"Take the exit onto {street or 'road'}",
            'fork': f"Take the fork {modifier or ''} onto {street or 'road'}",
            'end of road': f"At the end of the road, turn {modifier or ''} onto {street or 'road'}",
            'roundabout': f"Enter the roundabout and take the exit onto {street or 'road'}",
            'rotary': f"Enter the rotary and take the exit onto {street or 'road'}",
            'arrive': f"Arrive at destination"
        }
        
        res = inst_map.get(instruction, f"Proceed onto {street or 'road'}")
        res = " ".join(res.split())
        return f"{res} ({dist_str})"

    def reverse_geocode(self, lat, lng):
        """
        Reverse geocode coordinates using OpenStreetMap Nominatim API to detect the state.
        """
        url = f"https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat={lat}&lon={lng}"
        headers = {
            'User-Agent': 'HealX-Medical-App/1.0 (contact@healx.com)'
        }
        try:
            res = requests.get(url, headers=headers, timeout=5)
            if res.status_code == 200:
                data = res.json()
                address = data.get('address', {})
                state = address.get('state')
                # If union territory or special territory, check alternatives
                if not state:
                    state = address.get('territory') or address.get('union_territory')
                return {
                    'success': True,
                    'state': state,
                    'city': address.get('city') or address.get('town') or address.get('village'),
                    'country': address.get('country')
                }
            raise Exception("Nominatim geocoding response code not Ok")
        except Exception as e:
            print(f"Reverse geocoding error: {e}")
            return {'success': False, 'state': None}

map_service = MapService()
