import h5py
import json

print("Opening backup model to fix Dense layer inbound_nodes bug...")
with h5py.File('best_rop_model_backup.h5', 'r') as f_in:
    config_str = f_in.attrs['model_config']
    if isinstance(config_str, bytes):
        config_str = config_str.decode('utf-8')
    config_dict = json.loads(config_str)

# The bug in Keras 3 H5 saving: A Dense layer after Dropout in a Sequential
# sometimes gets a duplicate inbound node. Let's fix it.
for layer in config_dict['config']['layers']:
    if layer['class_name'] == 'Dense':
        if 'inbound_nodes' in layer and len(layer['inbound_nodes']) > 0:
            nodes = layer['inbound_nodes'][0]
            if isinstance(nodes, dict) and 'args' in nodes:
                args = nodes['args']
                if isinstance(args, list) and len(args) == 2:
                    # Fix: If it receives a list of two identical KerasTensors, keep only the first one
                    print(f"Fixing duplicate inputs for Dense layer: {layer.get('name')}")
                    nodes['args'] = [args[0]]
            elif isinstance(nodes, list) and len(nodes) == 2:
                print(f"Fixing duplicate inputs for Dense layer: {layer.get('name')}")
                layer['inbound_nodes'][0] = [nodes[0]]

# We will save this to a new patched H5
import shutil
shutil.copy('best_rop_model_backup.h5', 'best_rop_model_patched.h5')

with h5py.File('best_rop_model_patched.h5', 'r+') as f_out:
    new_config_str = json.dumps(config_dict).encode('utf-8')
    f_out.attrs['model_config'] = new_config_str
    print("Patched model saved to best_rop_model_patched.h5")
