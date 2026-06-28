import tensorflow as tf

class CustomDense(tf.keras.layers.Dense):
    def call(self, inputs, *args, **kwargs):
        if isinstance(inputs, list):
            print("Intercepted list of inputs in Dense! Taking the first one.")
            inputs = inputs[0]
        return super().call(inputs, *args, **kwargs)

try:
    print("Loading model with custom Dense layer to bypass Keras 3 bug...")
    model = tf.keras.models.load_model(
        'best_rop_model_backup.h5', 
        custom_objects={'Dense': CustomDense},
        compile=False
    )
    print("SUCCESS! Model loaded!")
except Exception as e:
    print(f"Failed: {e}")
