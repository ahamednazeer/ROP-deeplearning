import h5py
import json

with h5py.File('best_rop_model_backup.h5', 'r') as f:
    if 'model_config' in f.attrs:
        config_data = f.attrs['model_config']
        if isinstance(config_data, bytes):
            config_str = config_data.decode('utf-8')
        else:
            config_str = str(config_data)
        
        with open('model_architecture.json', 'w') as out:
            out.write(json.dumps(json.loads(config_str), indent=2))
        print("Architecture saved to model_architecture.json")
    else:
        print("No model config found.")
