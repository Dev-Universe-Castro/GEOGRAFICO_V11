from app import db
from datetime import datetime

class CropData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    municipality_code = db.Column(db.String(10), nullable=False)
    municipality_name = db.Column(db.String(100), nullable=False)
    state_code = db.Column(db.String(2), nullable=False)
    crop_name = db.Column(db.String(100), nullable=False)
    harvested_area = db.Column(db.Float, nullable=False)
    year = db.Column(db.Integer, nullable=False, default=2023)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<CropData {self.municipality_name} - {self.crop_name}>'

class ProcessingLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(200), nullable=False)
    status = db.Column(db.String(50), nullable=False)
    records_processed = db.Column(db.Integer, default=0)
    error_message = db.Column(db.Text)
    processed_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<ProcessingLog {self.filename} - {self.status}>'
