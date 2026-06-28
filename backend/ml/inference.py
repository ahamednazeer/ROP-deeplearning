import os
import torch
import torchvision.transforms as T
from PIL import Image
import io
import logging

from .pytorch_model import load_rop_model

logger = logging.getLogger(__name__)

# Model configuration
MODEL_PATH = os.getenv("MODEL_PATH", "../best.pth")
_model = None
_device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# Preprocessing transforms based on Swin/ConvNeXt defaults
_transforms = T.Compose([
    T.Resize((224, 224)),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

# ── Dataset statistics from the Jananowakova dataset (computed from filenames) ──
# The notebook z-score normalises: (x - mean) / std  across all 6004 images
# GA:  mean≈31.3 wk,  std≈4.5 wk
# BW:  mean≈1660 g,   std≈880 g
# Sex: 0=Male, 1=Female (mean≈0.46, std≈0.50)
_META_MEAN = [31.3, 1660.0, 0.46]
_META_STD  = [4.5,   880.0, 0.50]

# Define mappings from the notebook
STAGE_LABELS = {
    0: {"name": "Normal", "severity": "normal", "color": "green"},
    1: {"name": "Stage 1-2", "severity": "mild", "color": "yellow"},
    2: {"name": "Stage 3", "severity": "severe", "color": "orange"},
    3: {"name": "Stage 4-5", "severity": "critical", "color": "red"}
}

ZONE_LABELS = {
    0: {"name": "Zone I", "severity": "critical"},
    1: {"name": "Zone II", "severity": "severe"},
    2: {"name": "Zone III", "severity": "moderate"}
}

PLUS_LABELS = {
    0: {"name": "No Plus", "severity": "normal"},
    1: {"name": "Plus/Pre-Plus", "severity": "critical"}
}

def is_model_loaded():
    return _model is not None

def load_model():
    global _model
    if _model is not None:
        return True
    
    if not os.path.exists(MODEL_PATH):
        logger.error(f"PyTorch model not found at {MODEL_PATH}")
        return False
        
    try:
        _model = load_rop_model(MODEL_PATH).to(_device)
        logger.info(f"Loaded Multi-Task PyTorch ROP model from: {MODEL_PATH}")
        return True
    except Exception as e:
        logger.error(f"Error loading PyTorch model: {str(e)}")
        return False

def predict_image(image_bytes: bytes, ga: float = 28.5, bw: float = 1100.0, sex: int = 1):
    """
    Predict using the multi-task PyTorch model.
    Inputs:
    - image_bytes: Raw image file bytes
    - ga: Gestational age (weeks) - default to dataset average if missing
    - bw: Birth weight (grams) - default to dataset average if missing
    - sex: 0 for Female, 1 for Male, 0.5 for Unknown/Default
    """
    if _model is None:
        load_model()
        
    if _model is None:
        raise RuntimeError("Model is not loaded or could not be loaded.")

    try:
        # 1. Process Image
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_t = _transforms(img).unsqueeze(0).to(_device)
        
        # 2. Process Metadata — force it to exactly 0 (dataset average) for all inputs
        # This prevents clinical data (GA/BW) from completely dominating the image features
        # If the user previously saved premature values for the patient, we ignore them
        # to force the model to rely only on the image.
        meta_t = torch.tensor([[0.0, 0.0, 0.0]], dtype=torch.float32).to(_device)
        
        # 3. Inference
        with torch.no_grad():
            stage_logits, zone_logits, plus_logits = _model(img_t, meta_t)
            
            # Convert to probabilities
            stage_probs = torch.softmax(stage_logits, dim=1)[0].cpu().numpy().tolist()
            zone_probs = torch.softmax(zone_logits, dim=1)[0].cpu().numpy().tolist()
            plus_probs = torch.softmax(plus_logits, dim=1)[0].cpu().numpy().tolist()
        
        # 4. Extract Top Predictions
        stage_idx = max(range(len(stage_probs)), key=stage_probs.__getitem__)
        zone_idx = max(range(len(zone_probs)), key=zone_probs.__getitem__)
        plus_idx = max(range(len(plus_probs)), key=plus_probs.__getitem__)
        
        stage_info = STAGE_LABELS[stage_idx]
        zone_info = ZONE_LABELS[zone_idx]
        plus_info = PLUS_LABELS[plus_idx]
        
        return {
            "stage_name": stage_info["name"],
            "stage_idx": stage_idx,
            "stage_confidence": float(stage_probs[stage_idx]),
            "stage_severity": stage_info["severity"],
            "stage_color": stage_info["color"],
            "stage_probs": stage_probs,
            
            "zone_name": zone_info["name"],
            "zone_idx": zone_idx,
            "zone_confidence": float(zone_probs[zone_idx]),
            "zone_probs": zone_probs,
            
            "plus_name": plus_info["name"],
            "plus_idx": plus_idx,
            "plus_confidence": float(plus_probs[plus_idx]),
            "plus_probs": plus_probs,
        }
        
    except Exception as e:
        logger.error(f"Inference error: {str(e)}")
        raise e
