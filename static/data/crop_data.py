
# Dados de cultivos do IBGE 2023 - Área colhida em hectares
CROP_DATA = {
    "1100015": {  # Alta Floresta D'Oeste - RO
        "municipality_name": "Alta Floresta D'Oeste",
        "state_code": "RO",
        "crops": {
            "Abacaxi*": 4,
            "Açaí": 3,
            "Amendoim (em casca)": 3,
            "Arroz (em casca)": 100,
            "Banana (cacho)": 150,
            "Cacau (em amêndoa)": 55,
            "Café (em grão) Total": 6370,
            "Café (em grão) Canephora": 6370,
            "Cana-de-açúcar": 5,
            "Coco-da-baía*": 2,
            "Feijão (em grão)": 850,
            "Goiaba": 3,
            "Limão": 6,
            "Mamão": 3,
            "Mandioca": 406,
            "Maracujá": 5,
            "Melancia": 20,
            "Milho (em grão)": 1850,
            "Pimenta-do-reino": 2,
            "Soja (em grão)": 1318,
            "Tomate": 7,
            "Urucum (semente)": 3
        }
    },
    "1100023": {  # Ariquemes - RO
        "municipality_name": "Ariquemes",
        "state_code": "RO",
        "crops": {
            "Abacaxi*": 22,
            "Açaí": 6,
            "Arroz (em casca)": 150,
            "Banana (cacho)": 185,
            "Cacau (em amêndoa)": 275,
            "Café (em grão) Total": 250,
            "Café (em grão) Canephora": 250,
            "Cana-de-açúcar": 25,
            "Coco-da-baía*": 6,
            "Feijão (em grão)": 3,
            "Goiaba": 4,
            "Guaraná (semente)": 2,
            "Laranja": 8,
            "Limão": 8,
            "Mamão": 4,
            "Mandioca": 105,
            "Maracujá": 18,
            "Melancia": 23,
            "Milho (em grão)": 2370,
            "Soja (em grão)": 13106,
            "Tomate": 4,
            "Urucum (semente)": 8
        }
    },
    "1100304": {  # Vilhena - RO
        "municipality_name": "Vilhena",
        "state_code": "RO",
        "crops": {
            "Abacaxi*": 16,
            "Algodão herbáceo (em caroço)": 10687,
            "Amendoim (em casca)": 3,
            "Arroz (em casca)": 290,
            "Banana (cacho)": 5,
            "Cacau (em amêndoa)": 2,
            "Café (em grão) Total": 30,
            "Café (em grão) Canephora": 30,
            "Cana-de-açúcar": 3,
            "Feijão (em grão)": 5,
            "Goiaba": 1,
            "Laranja": 8,
            "Limão": 4,
            "Mamão": 2,
            "Mandioca": 15,
            "Melancia": 5,
            "Milho (em grão)": 38195,
            "Soja (em grão)": 43211,
            "Tangerina": 2,
            "Tomate": 11,
            "Urucum (semente)": 2
        }
    }
}

def get_available_crops():
    """Get list of all available crops"""
    crops = set()
    for municipality_data in CROP_DATA.values():
        crops.update(municipality_data["crops"].keys())
    return sorted(list(crops))

def get_crop_data_for_map(crop_name):
    """Get crop data formatted for map visualization"""
    data = {}
    for municipality_code, municipality_data in CROP_DATA.items():
        if crop_name in municipality_data["crops"]:
            data[municipality_code] = {
                "municipality_name": municipality_data["municipality_name"],
                "state_code": municipality_data["state_code"],
                "harvested_area": municipality_data["crops"][crop_name]
            }
    return data

def get_crop_chart_data(crop_name):
    """Get crop data for chart visualization"""
    data = []
    for municipality_data in CROP_DATA.values():
        if crop_name in municipality_data["crops"]:
            data.append({
                "municipality_name": municipality_data["municipality_name"],
                "state_code": municipality_data["state_code"],
                "harvested_area": municipality_data["crops"][crop_name]
            })
    
    # Sort by harvested area descending and take top 20
    data.sort(key=lambda x: x["harvested_area"], reverse=True)
    data = data[:20]
    
    return {
        "labels": [f"{item['municipality_name']} ({item['state_code']})" for item in data],
        "data": [item["harvested_area"] for item in data],
        "crop_name": crop_name
    }

def get_statistics():
    """Get general statistics"""
    total_municipalities = len(CROP_DATA)
    all_crops = get_available_crops()
    total_crops = len(all_crops)
    total_records = sum(len(municipality_data["crops"]) for municipality_data in CROP_DATA.values())
    
    return {
        "total_municipalities": total_municipalities,
        "total_crops": total_crops,
        "total_records": total_records,
        "last_update": "2023-12-31T00:00:00"
    }
