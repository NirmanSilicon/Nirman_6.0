# Fine-tune VidyaAI in Google Colab

Upload `ai-train.zip` to the Colab session, then run these cells in order.

### 1. Install the training dependencies

```python
%pip install transformers peft datasets accelerate
```

### 2. Upload and unzip the project data

```python
from google.colab import files

uploaded = files.upload()
zip_name = next(iter(uploaded))
!unzip -o "$zip_name" -d /content/ai-train
```

### 3. Enter the training directory

```python
%cd /content/ai-train/ai-model/training
```

### 4. Start training

```python
!python train_local.py
```

### 5. Zip and download the fine-tuned model

```python
!zip -r /content/vidyanova-finetuned.zip ../models/finetuned
files.download("/content/vidyanova-finetuned.zip")
```
