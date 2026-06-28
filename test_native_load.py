import tensorflow as tf
try:
    print(f"Loading in TF {tf.__version__}...")
    model = tf.keras.models.load_model('best_rop_model_backup.h5')
    print("SUCCESS: Native Keras 2 load_model worked perfectly!")
except Exception as e:
    import traceback
    traceback.print_exc()
