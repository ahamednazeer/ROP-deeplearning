import os
import tensorflow as tf

print(f"TF Version: {tf.__version__}")

try:
    base_model = tf.keras.applications.EfficientNetB0(
        input_shape=(224, 224, 3), 
        include_top=False, 
        weights=None
    )
    
    _model = tf.keras.Sequential([
        base_model,
        tf.keras.layers.GlobalAveragePooling2D(),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Dense(256, activation='relu'),
        tf.keras.layers.Dropout(0.5),
        tf.keras.layers.Dense(128, activation='relu'),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Dense(11, activation='softmax')
    ])
    
    print("Architecture built. Attempting to load weights natively in TF 2.15...")
    _model.load_weights('best_rop_model_backup.h5')
    print("SUCCESS: Weights loaded into explicit architecture!")
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"ERROR: {e}")
