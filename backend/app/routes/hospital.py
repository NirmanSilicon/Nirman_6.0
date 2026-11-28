from flask import Blueprint, jsonify, request
from app.models.hospital import Hospital
from app.services.ai_service import ai_service

hospital_bp = Blueprint('hospital', __name__)

@hospital_bp.route('/seed', methods=['POST'])
def seed_hospitals():
    Hospital.seed_data()
    return jsonify({"message": "Hospitals seeded successfully"}), 200

@hospital_bp.route('/', methods=['GET'])
def get_hospitals():
    hospitals = Hospital.get_all()
    return jsonify(hospitals), 200

@hospital_bp.route('/search', methods=['GET'])
def search_hospitals():
    disease = request.args.get('disease', '')
    state = request.args.get('state', '')
    query = request.args.get('query', '').lower()
    lat = request.args.get('lat')
    lng = request.args.get('lng')
    
    lat_val = float(lat) if lat else None
    lng_val = float(lng) if lng else None
    
    # 1. Identify active department (recommend by AI if disease symptom is given)
    department = 'General'
    if disease:
        department = ai_service.recommend_department(disease)
        
    # 2. Fetch multi-factor ranked recommendations from engine
    from app.ai.recommendation_engine import recommendation_engine
    hospitals = recommendation_engine.recommend(department, lat_val, lng_val)
    
    # 3. Apply state filter if provided
    if state:
        hospitals = [h for h in hospitals if state.lower() in h.get('location', {}).get('state', '').lower() or state.lower() in h.get('address', '').lower()]
        
    # 4. Apply text search query filter if provided
    if query:
        hospitals = [h for h in hospitals if query in h.get('name', '').lower() or query in h.get('address', '').lower() or query in h.get('location', {}).get('city', '').lower()]

    return jsonify(hospitals), 200

@hospital_bp.route('/<hospital_id>/route', methods=['GET'])
def get_hospital_route(hospital_id):
    start_lat = request.args.get('start_lat')
    start_lng = request.args.get('start_lng')
    
    if not start_lat or not start_lng:
        return jsonify({'message': 'Start coordinates (start_lat, start_lng) are required'}), 400
        
    hospital = Hospital.get_by_id(hospital_id)
    if not hospital:
        return jsonify({'message': 'Hospital not found'}), 404
        
    dest_location = hospital.get('location', {})
    dest_lat = dest_location.get('lat')
    dest_lng = dest_location.get('lng')
    
    if dest_lat is None or dest_lng is None:
        return jsonify({'message': 'Hospital coordinates not available'}), 400
        
    from app.services.map_service import map_service
    route_data = map_service.get_detailed_route(
        float(start_lat), float(start_lng),
        float(dest_lat), float(dest_lng),
        hospital.get('crowd_level', 'Low')
    )
    
    return jsonify(route_data), 200

@hospital_bp.route('/<hospital_id>/queue', methods=['GET'])
def get_hospital_queue(hospital_id):
    hospital = Hospital.get_by_id(hospital_id)
    if not hospital:
        return jsonify({'message': 'Hospital not found'}), 404
        
    from app.models.queue import Queue
    queue_data = {}
    
    # Return queue wait times for all specialties of this hospital
    for dept in hospital.get('specialties', []):
        q = Queue.get_queue(hospital_id, dept)
        total = q.get('total_in_queue', 0)
        serving = q.get('current_serving', 0)
        avg_time = q.get('avg_time_per_patient', 10)
        people_ahead = max(0, total - serving)
        
        queue_data[dept] = {
            'total_in_queue': total,
            'current_serving': serving,
            'avg_time_per_patient': avg_time,
            'wait_time_mins': people_ahead * avg_time
        }
        
    return jsonify(queue_data), 200

@hospital_bp.route('/<hospital_id>', methods=['GET'])
def get_hospital(hospital_id):
    hospital = Hospital.get_by_id(hospital_id)
    if hospital:
        return jsonify(hospital), 200
    return jsonify({'message': 'Hospital not found'}), 404

@hospital_bp.route('/<hospital_id>', methods=['PUT'])
def update_hospital(hospital_id):
    data = request.json
    hospital = Hospital.update(hospital_id, data)
    if hospital:
        return jsonify(hospital), 200
    return jsonify({'message': 'Hospital not found'}), 404

