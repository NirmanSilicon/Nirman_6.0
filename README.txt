KrushiDrishti AI (v2.0 - Tomato + Brinjal)
==========================================
TensorFlow Version:   2.21.0
Best Training Acc:    87.83%
Best Validation Acc:  87.46%
Total Classes:        12
Classes:              ['Brinjal_Healthy', 'Brinjal_Insect_Pest', 'Brinjal_Leaf_Spot', 'Brinjal_Mosaic_Virus', 'Brinjal_Small_Leaf', 'Brinjal_White_Mold', 'Brinjal_Wilt', 'Tomato_Early_Blight', 'Tomato_Healthy', 'Tomato_Late_Blight', 'Tomato_Leaf_Mold', 'Tomato_Target_Spot']

How to Run Locally:
1. pip install -r requirements.txt
2. uvicorn app:app --host 0.0.0.0 --port 8000 --reload
3. Open http://127.0.0.1:8000/docs -> POST /predict (key: "file")
