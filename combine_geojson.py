import json
import os

def combine_geojson_files():
    """Combine multiple state GeoJSON files into one"""
    combined_features = []
    
    # All Brazilian states
    states = [
        'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 
        'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 
        'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    ]
    
    for state in states:
        file_path = f'static/data/{state}.geojson'
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if 'features' in data:
                        combined_features.extend(data['features'])
                        print(f"Added {len(data['features'])} municipalities from {state}")
            except Exception as e:
                print(f"Error reading {file_path}: {e}")
        else:
            print(f"File not found: {file_path}")
    
    # Create combined GeoJSON
    combined_geojson = {
        "type": "FeatureCollection",
        "features": combined_features
    }
    
    # Save combined file
    output_path = 'static/data/brazil_municipalities_all.geojson'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(combined_geojson, f, ensure_ascii=False, separators=(',', ':'))
    
    print(f"Combined {len(combined_features)} municipalities from all Brazil saved to {output_path}")

if __name__ == "__main__":
    combine_geojson_files()