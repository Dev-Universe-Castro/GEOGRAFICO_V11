import os
from flask import Flask, render_template, jsonify, request, send_file
import json
import pandas as pd
from app import app
import io

# Load crop data
def load_crop_data():
    try:
        with open('data/crop_data_static.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print("Arquivo crop_data_static.json não encontrado")
        return {}
    except Exception as e:
        print(f"Erro ao carregar dados: {e}")
        return {}

CROP_DATA = load_crop_data()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analysis')
def analysis():
    return render_template('analysis.html')

@app.route('/api/brazilian-states')
def get_states():
    try:
        # Brazilian states
        states = [
            {'code': 'AC', 'name': 'Acre'},
            {'code': 'AL', 'name': 'Alagoas'},
            {'code': 'AP', 'name': 'Amapá'},
            {'code': 'AM', 'name': 'Amazonas'},
            {'code': 'BA', 'name': 'Bahia'},
            {'code': 'CE', 'name': 'Ceará'},
            {'code': 'DF', 'name': 'Distrito Federal'},
            {'code': 'ES', 'name': 'Espírito Santo'},
            {'code': 'GO', 'name': 'Goiás'},
            {'code': 'MA', 'name': 'Maranhão'},
            {'code': 'MT', 'name': 'Mato Grosso'},
            {'code': 'MS', 'name': 'Mato Grosso do Sul'},
            {'code': 'MG', 'name': 'Minas Gerais'},
            {'code': 'PA', 'name': 'Pará'},
            {'code': 'PB', 'name': 'Paraíba'},
            {'code': 'PR', 'name': 'Paraná'},
            {'code': 'PE', 'name': 'Pernambuco'},
            {'code': 'PI', 'name': 'Piauí'},
            {'code': 'RJ', 'name': 'Rio de Janeiro'},
            {'code': 'RN', 'name': 'Rio Grande do Norte'},
            {'code': 'RS', 'name': 'Rio Grande do Sul'},
            {'code': 'RO', 'name': 'Rondônia'},
            {'code': 'RR', 'name': 'Roraima'},
            {'code': 'SC', 'name': 'Santa Catarina'},
            {'code': 'SP', 'name': 'São Paulo'},
            {'code': 'SE', 'name': 'Sergipe'},
            {'code': 'TO', 'name': 'Tocantins'}
        ]

        return jsonify({
            'success': True,
            'states': states
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/statistics')
def get_statistics():
    try:
        # CROP_DATA structure: {crop_name: {municipality_code: {data}}}
        total_crops = len(CROP_DATA)

        # Count unique municipalities across all crops
        all_municipalities = set()
        for crop_data in CROP_DATA.values():
            all_municipalities.update(crop_data.keys())

        total_municipalities = len(all_municipalities)

        return jsonify({
            'success': True,
            'total_crops': total_crops,
            'total_municipalities': total_municipalities
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/crops')
def get_crops():
    try:
        # CROP_DATA structure: {crop_name: {municipality_code: {data}}}
        sorted_crops = sorted(list(CROP_DATA.keys()))
        return jsonify({
            'success': True,
            'crops': sorted_crops
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/crop-data/<crop_name>')
def get_crop_data(crop_name):
    try:
        if crop_name not in CROP_DATA:
            return jsonify({'success': False, 'error': 'Cultura não encontrada'})

        crop_municipalities = CROP_DATA[crop_name]

        return jsonify({
            'success': True,
            'data': crop_municipalities
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/crop-chart-data/<crop_name>')
def get_crop_chart_data(crop_name):
    try:
        if crop_name not in CROP_DATA:
            return jsonify({'success': False, 'error': 'Cultura não encontrada'})

        crop_municipalities = []
        for municipality_code, municipality_data in CROP_DATA[crop_name].items():
            crop_municipalities.append({
                'municipality_name': municipality_data.get('municipality_name', 'Desconhecido'),
                'state_code': municipality_data.get('state_code', 'XX'),
                'harvested_area': municipality_data.get('harvested_area', 0)
            })

        # Sort by harvested area and take top 20
        crop_municipalities.sort(key=lambda x: x['harvested_area'], reverse=True)
        top_20 = crop_municipalities[:20]

        chart_data = {
            'labels': [f"{muni['municipality_name']} ({muni['state_code']})" for muni in top_20],
            'data': [muni['harvested_area'] for muni in top_20]
        }

        return jsonify({
            'success': True,
            'chart_data': chart_data
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/analysis/statistical-summary/<crop_name>')
def get_statistical_summary(crop_name):
    try:
        if crop_name not in CROP_DATA:
            return jsonify({'success': False, 'error': 'Cultura não encontrada'})

        values = [data['harvested_area'] for data in CROP_DATA[crop_name].values()]

        import statistics
        summary = {
            'mean': statistics.mean(values),
            'median': statistics.median(values),
            'mode': statistics.mode(values) if len(set(values)) < len(values) else None,
            'std_dev': statistics.stdev(values) if len(values) > 1 else 0,
            'min': min(values),
            'max': max(values),
            'q1': statistics.quantiles(values, n=4)[0] if len(values) >= 4 else None,
            'q3': statistics.quantiles(values, n=4)[2] if len(values) >= 4 else None,
            'total': sum(values),
            'count': len(values)
        }

        return jsonify({
            'success': True,
            'summary': summary
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/analysis/by-state/<crop_name>')
def get_analysis_by_state(crop_name):
    try:
        if crop_name not in CROP_DATA:
            return jsonify({'success': False, 'error': 'Cultura não encontrada'})

        states_data = {}
        for municipality_data in CROP_DATA[crop_name].values():
            state = municipality_data.get('state_code', 'XX')
            area = municipality_data.get('harvested_area', 0)

            if state not in states_data:
                states_data[state] = {
                    'total_area': 0,
                    'municipalities_count': 0,
                    'max_area': 0,
                    'municipalities': []
                }

            states_data[state]['total_area'] += area
            states_data[state]['municipalities_count'] += 1
            states_data[state]['max_area'] = max(states_data[state]['max_area'], area)
            states_data[state]['municipalities'].append({
                'name': municipality_data.get('municipality_name'),
                'area': area
            })

        # Calculate averages
        for state_data in states_data.values():
            state_data['average_area'] = state_data['total_area'] / state_data['municipalities_count']

        return jsonify({
            'success': True,
            'states_data': states_data
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/analysis/comparison/<crop1>/<crop2>')
def get_crop_comparison(crop1, crop2):
    try:
        if crop1 not in CROP_DATA or crop2 not in CROP_DATA:
            return jsonify({'success': False, 'error': 'Uma ou ambas culturas não encontradas'})

        # Get common municipalities
        common_municipalities = set(CROP_DATA[crop1].keys()) & set(CROP_DATA[crop2].keys())

        comparison_data = []
        for muni_code in common_municipalities:
            data1 = CROP_DATA[crop1][muni_code]
            data2 = CROP_DATA[crop2][muni_code]

            comparison_data.append({
                'municipality_code': muni_code,
                'municipality_name': data1.get('municipality_name'),
                'state_code': data1.get('state_code'),
                'crop1_area': data1.get('harvested_area', 0),
                'crop2_area': data2.get('harvested_area', 0),
                'ratio': data1.get('harvested_area', 0) / max(data2.get('harvested_area', 1), 1)
            })

        return jsonify({
            'success': True,
            'crop1': crop1,
            'crop2': crop2,
            'comparison_data': comparison_data,
            'common_municipalities': len(common_municipalities)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/export/complete-data')
def export_complete_data():
    """Export complete crop data as Excel file"""
    try:
        # Load the original Excel file
        excel_path = os.path.join('data', 'ibge_2023_hectares_colhidos.xlsx')

        if not os.path.exists(excel_path):
            # Try alternative path
            excel_path = os.path.join('attached_assets', 'IBGE - 2023 - BRASIL HECTARES COLHIDOS_1752980032040.xlsx')

        if not os.path.exists(excel_path):
            return jsonify({'success': False, 'error': 'Arquivo de dados não encontrado'}), 404

        # Read the Excel file
        df = pd.read_excel(excel_path)

        # Create a BytesIO object to store the Excel file
        output = io.BytesIO()

        # Write to Excel
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Culturas IBGE 2023', index=False)

        output.seek(0)

        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='base_completa_culturas_ibge_2023.xlsx'
        )

    except Exception as e:
        print(f"Erro ao exportar dados: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)