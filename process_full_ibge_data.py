
import pandas as pd
import json
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def process_complete_ibge_data():
    """Process the complete IBGE Excel file with all municipalities and crops"""
    
    excel_files = [
        'attached_assets/IBGE - 2023 - BRASIL HECTARES COLHIDOS_1752979906944.xlsx',
        'attached_assets/IBGE - 2023 - BRASIL HECTARES COLHIDOS_1752980032040.xlsx',
        'data/ibge_2023_hectares_colhidos.xlsx'
    ]
    
    excel_path = None
    for file_path in excel_files:
        if os.path.exists(file_path):
            excel_path = file_path
            break
    
    if not excel_path:
        logger.error("Nenhum arquivo Excel do IBGE encontrado!")
        return
    
    try:
        logger.info(f"Processando arquivo: {excel_path}")
        
        # Read Excel file
        df = pd.read_excel(excel_path)
        logger.info(f"Arquivo carregado com {len(df)} linhas e {len(df.columns)} colunas")
        
        # Show column names
        logger.info(f"Colunas: {list(df.columns)}")
        
        # Dictionary to store all data
        complete_crop_data = {}
        
        # Get crop columns (skip first two columns which are code and municipality)
        crop_columns = df.columns[2:]
        logger.info(f"Culturas encontradas: {len(crop_columns)} culturas")
        
        # Initialize crop dictionaries
        for crop_name in crop_columns:
            complete_crop_data[crop_name] = {}
        
        processed_municipalities = 0
        total_records = 0
        
        # Process each row (municipality)
        for index, row in df.iterrows():
            try:
                # Get municipality code and info
                municipality_code = str(row.iloc[0]) if pd.notna(row.iloc[0]) else None
                municipality_info = str(row.iloc[1]) if pd.notna(row.iloc[1]) else None
                
                if not municipality_code or not municipality_info:
                    continue
                
                # Ensure municipality code has correct format (7 digits)
                municipality_code = municipality_code.zfill(7)
                
                # Extract municipality name and state
                if " (" in municipality_info and municipality_info.endswith(")"):
                    municipality_name = municipality_info.split(" (")[0].strip()
                    state_code = municipality_info.split(" (")[1].replace(")", "").strip()
                else:
                    municipality_name = municipality_info.strip()
                    state_code = "XX"
                
                processed_municipalities += 1
                
                # Process each crop for this municipality
                for crop_name in crop_columns:
                    try:
                        area_value = row[crop_name]
                        
                        # Skip if no data, dash, or empty
                        if pd.isna(area_value) or area_value == '-' or area_value == '':
                            continue
                        
                        # Convert to numeric
                        if isinstance(area_value, str):
                            # Remove any non-numeric characters except decimal point
                            area_value = area_value.replace(',', '.').replace(' ', '')
                            try:
                                area_value = float(area_value)
                            except:
                                continue
                        
                        # Convert to float and validate
                        harvested_area = float(area_value)
                        if harvested_area <= 0:
                            continue
                        
                        # Add to data structure
                        complete_crop_data[crop_name][municipality_code] = {
                            "municipality_name": municipality_name,
                            "state_code": state_code,
                            "harvested_area": harvested_area
                        }
                        
                        total_records += 1
                        
                    except Exception as crop_error:
                        continue
                
                # Log progress every 1000 municipalities
                if processed_municipalities % 1000 == 0:
                    logger.info(f"Processados {processed_municipalities} municípios...")
                    
            except Exception as e:
                logger.error(f"Erro na linha {index}: {e}")
                continue
        
        # Remove crops with no data
        complete_crop_data = {crop: data for crop, data in complete_crop_data.items() if data}
        
        # Save to JSON file
        os.makedirs('data', exist_ok=True)
        with open('data/crop_data_static.json', 'w', encoding='utf-8') as f:
            json.dump(complete_crop_data, f, ensure_ascii=False, indent=2)
        
        logger.info("=" * 60)
        logger.info("PROCESSAMENTO COMPLETO!")
        logger.info(f"Total de municípios processados: {processed_municipalities}")
        logger.info(f"Total de registros válidos: {total_records}")
        logger.info(f"Total de culturas com dados: {len(complete_crop_data)}")
        
        # Show crops with most municipalities
        crop_stats = []
        for crop_name, data in complete_crop_data.items():
            crop_stats.append((crop_name, len(data)))
        
        crop_stats.sort(key=lambda x: x[1], reverse=True)
        
        logger.info("\nTop 10 culturas por número de municípios:")
        for i, (crop_name, count) in enumerate(crop_stats[:10]):
            logger.info(f"{i+1:2d}. {crop_name}: {count} municípios")
        
        # Show total municipalities with any crop data
        all_municipalities = set()
        for crop_data in complete_crop_data.values():
            all_municipalities.update(crop_data.keys())
        
        logger.info(f"\nTotal de municípios únicos com dados: {len(all_municipalities)}")
        logger.info("=" * 60)
        
        return {
            "success": True,
            "municipalities": processed_municipalities,
            "records": total_records,
            "crops": len(complete_crop_data),
            "unique_municipalities": len(all_municipalities)
        }
        
    except Exception as e:
        logger.error(f"Erro no processamento: {e}")
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    result = process_complete_ibge_data()
    if result["success"]:
        print("\n✅ Processamento concluído com sucesso!")
        print(f"📊 {result['municipalities']} municípios processados")
        print(f"📈 {result['records']} registros válidos")
        print(f"🌾 {result['crops']} culturas diferentes")
        print(f"🏘️ {result['unique_municipalities']} municípios únicos")
    else:
        print(f"\n❌ Erro: {result['error']}")
