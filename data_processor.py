import pandas as pd
import json
import os
import logging
from app import db
from models import CropData, ProcessingLog
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger(__name__)

def process_ibge_data(excel_path):
    """Process IBGE Excel data and store in database"""
    try:
        logger.info(f"Starting to process IBGE data from {excel_path}")
        
        # Read Excel file
        df = pd.read_excel(excel_path)
        logger.info(f"Excel file loaded with {len(df)} rows and {len(df.columns)} columns")
        
        # Log column names for debugging
        logger.debug(f"Columns in Excel: {list(df.columns)}")
        
        # Clear existing data
        db.session.query(CropData).delete()
        db.session.commit()
        
        processed_count = 0
        error_count = 0
        
        # Get crop columns (skip CÓDIGO IBGE and MUNICÍPIO - UF)
        crop_columns = df.columns[2:]
        
        # Process each row and each crop
        for index, row in df.iterrows():
            try:
                municipality_code = str(row.iloc[0]) if pd.notna(row.iloc[0]) else "0"
                municipality_info = str(row.iloc[1]) if pd.notna(row.iloc[1]) else "Unknown"
                
                # Extract municipality name and state from "MUNICÍPIO - UF" format
                if " (" in municipality_info and municipality_info.endswith(")"):
                    municipality_name = municipality_info.split(" (")[0]
                    state_code = municipality_info.split(" (")[1].replace(")", "")
                else:
                    municipality_name = municipality_info
                    state_code = "XX"
                
                # Process each crop for this municipality
                for crop_name in crop_columns:
                    try:
                        area_value = row[crop_name]
                        
                        # Skip if no data or dash
                        if pd.isna(area_value) or area_value == '-' or area_value == '':
                            continue
                            
                        # Convert to float
                        if isinstance(area_value, str):
                            area_value = area_value.replace(',', '.')
                            if not area_value.replace('.', '', 1).isdigit():
                                continue
                        
                        harvested_area = float(area_value)
                        if harvested_area <= 0:
                            continue
                            
                        crop_data = CropData(
                            municipality_code=municipality_code,
                            municipality_name=municipality_name,
                            state_code=state_code,
                            crop_name=crop_name,
                            harvested_area=harvested_area,
                            year=2023
                        )
                        
                        db.session.add(crop_data)
                        processed_count += 1
                        
                        if processed_count % 500 == 0:
                            db.session.commit()
                            logger.debug(f"Processed {processed_count} records")
                            
                    except Exception as crop_error:
                        error_count += 1
                        continue
                        
            except Exception as e:
                error_count += 1
                logger.error(f"Error processing row {index}: {e}")
                continue
        
        # Final commit
        db.session.commit()
        
        # Log processing result
        log_entry = ProcessingLog(
            filename=os.path.basename(excel_path),
            status="success",
            records_processed=processed_count
        )
        db.session.add(log_entry)
        db.session.commit()
        
        logger.info(f"Data processing completed. Processed: {processed_count}, Errors: {error_count}")
        
        # Save processed data to JSON for frontend use
        save_processed_data_to_json()
        
        return {
            "success": True,
            "processed": processed_count,
            "errors": error_count,
            "message": f"Successfully processed {processed_count} records"
        }
        
    except Exception as e:
        logger.error(f"Error processing IBGE data: {e}")
        
        # Log processing error
        log_entry = ProcessingLog(
            filename=os.path.basename(excel_path),
            status="error",
            error_message=str(e)
        )
        db.session.add(log_entry)
        db.session.commit()
        
        return {
            "success": False,
            "error": str(e)
        }

def save_processed_data_to_json():
    """Save processed data to JSON file for frontend use"""
    try:
        # Ensure data directory exists
        os.makedirs('data', exist_ok=True)
        
        # Get all crop data
        crop_data = db.session.query(CropData).all()
        
        # Group by crop
        data_by_crop = {}
        for record in crop_data:
            crop_name = record.crop_name
            if crop_name not in data_by_crop:
                data_by_crop[crop_name] = {}
            
            data_by_crop[crop_name][record.municipality_code] = {
                "municipality_name": record.municipality_name,
                "state_code": record.state_code,
                "harvested_area": record.harvested_area
            }
        
        # Save to JSON
        with open('data/processed_data.json', 'w', encoding='utf-8') as f:
            json.dump(data_by_crop, f, ensure_ascii=False, indent=2)
        
        logger.info("Processed data saved to JSON successfully")
        
    except Exception as e:
        logger.error(f"Error saving processed data to JSON: {e}")

def get_available_crops():
    """Get list of available crops"""
    try:
        crops = db.session.query(CropData.crop_name).distinct().all()
        return [crop[0] for crop in crops if crop[0]]
    except Exception as e:
        logger.error(f"Error getting available crops: {e}")
        return []

def get_crop_data_for_map(crop_name):
    """Get crop data formatted for map visualization"""
    try:
        # Only get records with valid 7-digit municipality codes
        crop_data = db.session.query(CropData).filter(
            CropData.crop_name == crop_name,
            db.func.length(CropData.municipality_code) == 7
        ).all()
        
        data = {}
        for record in crop_data:
            data[record.municipality_code] = {
                "municipality_name": record.municipality_name,
                "state_code": record.state_code,
                "harvested_area": record.harvested_area
            }
        
        logger.info(f"Returning {len(data)} valid municipality records for {crop_name}")
        return data
    except Exception as e:
        logger.error(f"Error getting crop data for map: {e}")
        return {}
