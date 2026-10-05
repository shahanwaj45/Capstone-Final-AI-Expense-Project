import io
from PIL import Image

def test_receipt_scan_no_file(client, student_auth_headers):
    res = client.post('/api/receipts/scan', headers=student_auth_headers)
    assert res.status_code == 400
    data = res.get_json()
    assert data['success'] is False

def test_receipt_scan_invalid_extension(client, student_auth_headers):
    data = {
        'file': (io.BytesIO(b'dummy content'), 'test.exe')
    }
    res = client.post('/api/receipts/scan', headers=student_auth_headers, data=data, content_type='multipart/form-data')
    assert res.status_code == 400
    res_data = res.get_json()
    assert res_data['success'] is False
    assert 'Invalid file type' in res_data['error']['message']

def test_receipt_confirm(client, student_auth_headers):
    payload = {
        'merchant': 'Supermarket Grocery',
        'amount': 350.50,
        'category': 'Food',
        'date': '2026-09-20',
        'receipt_url': '/api/receipts/image/receipt_dummy123.jpg',
        'source': 'camera'
    }
    res = client.post('/api/receipts/confirm', headers=student_auth_headers, json=payload)
    assert res.status_code == 201
    data = res.get_json()
    assert data['success'] is True
    assert data['data']['name'] == 'Supermarket Grocery'
    assert data['data']['amount_raw'] == 350.50
    assert data['data']['category'] == 'Food'
    assert data['data']['receipt_url'] == '/api/receipts/image/receipt_dummy123.jpg'
    assert 'Camera receipt scan' in data['data']['notes']

def test_receipt_scan_auto_save_mock(client, student_auth_headers, monkeypatch, tmp_path):
    from app.routes import receipts as receipts_mod
    
    # Mock scan_receipt to return valid parsed data
    mock_extracted = {
        'merchant': 'Coffee Cafe',
        'amount': 180.00,
        'date': '2026-09-25',
        'category': 'Food'
    }
    monkeypatch.setattr(receipts_mod, 'scan_receipt', lambda path: (mock_extracted, None))
    
    # Create simple dummy png image in memory
    img = Image.new('RGB', (60, 30), color='red')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    
    data = {
        'file': (img_byte_arr, 'camera_shot.png'),
        'source': 'camera',
        'auto_save': 'true',
        'use_today': 'true'
    }
    
    res = client.post('/api/receipts/scan', headers=student_auth_headers, data=data, content_type='multipart/form-data')
    assert res.status_code == 200
    res_data = res.get_json()
    assert res_data['success'] is True
    assert res_data['data']['saved'] is True
    assert res_data['data']['source'] == 'camera'
    assert res_data['data']['receipt_url'].startswith('/api/receipts/image/')
    assert res_data['data']['transaction']['name'] == 'Coffee Cafe'
    assert res_data['data']['transaction']['amount_raw'] == 180.00

    # Also test image serve endpoint
    filename = res_data['data']['receipt_filename']
    img_res = client.get(f'/api/receipts/image/{filename}')
    assert img_res.status_code == 200

