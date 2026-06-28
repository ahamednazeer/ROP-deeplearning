import h5py
import json

def clean_config(obj):
    if isinstance(obj, dict):
        # If this dict is a DTypePolicy, just return the string name (e.g., "float32")
        if obj.get('class_name') == 'DTypePolicy' and 'config' in obj:
            return obj['config'].get('name', 'float32')
        
        # Recursively clean dict values
        new_dict = {}
        for k, v in obj.items():
            # Also fix the batch_shape issue
            if k == 'batch_shape':
                new_dict['batch_input_shape'] = clean_config(v)
            else:
                new_dict[k] = clean_config(v)
        return new_dict
    elif isinstance(obj, list):
        return [clean_config(i) for i in obj]
    else:
        return obj

model_path = 'best_rop_model.h5'

print("Opening model for deep patch...")
with h5py.File(model_path, 'r+') as f:
    if 'model_config' in f.attrs:
        config_data = f.attrs['model_config']
        
        if isinstance(config_data, bytes):
            config_str = config_data.decode('utf-8')
        else:
            config_str = str(config_data)
            
        # Parse JSON
        config_json = json.loads(config_str)
        
        # Clean it recursively
        clean_json = clean_config(config_json)
        
        # Convert back to string
        new_config_str = json.dumps(clean_json)
        
        # Write back
        if isinstance(config_data, bytes):
            f.attrs['model_config'] = new_config_str.encode('utf-8')
        else:
            f.attrs['model_config'] = new_config_str
            
        print("Successfully cleaned Keras 3 metadata (DTypePolicy, batch_shape) for Keras 2 compatibility.")
    else:
        print("No model_config found.")
