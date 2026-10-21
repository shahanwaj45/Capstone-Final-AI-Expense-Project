import pytest
import io

def test_notifications_endpoint(client, prof_auth_headers, student_auth_headers):
    # Professional notifications
    res_prof = client.get('/api/notifications', headers=prof_auth_headers)
    assert res_prof.status_code == 200
    data_prof = res_prof.get_json()['data']
    assert 'items' in data_prof
    assert 'unread_count' in data_prof
    # Professional has a subscription in conftest
    assert isinstance(data_prof['items'], list)

    # Student notifications
    res_stu = client.get('/api/notifications', headers=student_auth_headers)
    assert res_stu.status_code == 200
    data_stu = res_stu.get_json()['data']
    assert 'items' in data_stu

def test_emergency_fund_put_and_runway(client, prof_auth_headers):
    # Test PUT on emergency fund
    res = client.put('/api/emergency-fund', json={
        'monthly_expense_estimate': 50000.0,
        'current_amount': 200000.0,
        'target_months': 6
    }, headers=prof_auth_headers)
    assert res.status_code == 200
    data = res.get_json()['data']
    assert data['target_months'] == 6
    assert data['current_amount'] == 200000.0
    assert data['monthsCovered'] == 4.0
    assert data['shortfall'] == 100000.0

def test_budgets_health_endpoint(client, student_auth_headers):
    res = client.get('/api/budgets/health', headers=student_auth_headers)
    assert res.status_code == 200
    data = res.get_json()['data']
    assert 'score' in data
    assert 'status' in data
    assert 'utilization_ratio' in data
    assert data['status'] in ['Optimal', 'Warning', 'Critical']

def test_subscriptions_normalized_burn(client, prof_auth_headers):
    # Create an annual subscription
    create_res = client.post('/api/subscriptions', json={
        'name': 'Amazon Prime Annual',
        'amount': 1499.0,
        'cycle': 'Annual'
    }, headers=prof_auth_headers)
    assert create_res.status_code == 201

    # Fetch list
    list_res = client.get('/api/subscriptions', headers=prof_auth_headers)
    assert list_res.status_code == 200
    data = list_res.get_json()['data']
    assert 'monthly_burn' in data
    assert 'monthly_total' in data
    # Check that monthly burn is less than raw total due to annual normalization
    assert data['monthly_burn'] < data['total']

def test_report_pdf_download_headers(client, prof_auth_headers):
    res = client.get('/api/reports/download?month=10&year=2026', headers=prof_auth_headers)
    assert res.status_code == 200
    assert res.headers['Content-Type'] == 'application/pdf'
    assert 'attachment' in res.headers['Content-Disposition']
    assert 'Statement_October_2026.pdf' in res.headers['Content-Disposition']
    assert len(res.data) > 1000

def test_voice_parse_endpoint_deterministic(client, student_auth_headers):
    res = client.post('/api/voice/parse', json={
        'text': 'Spent 350 rupees on Swiggy dinner using UPI'
    }, headers=student_auth_headers)
    assert res.status_code == 200
    data = res.get_json()['data']
    assert 'parsed' in data
    parsed = data['parsed']
    assert parsed['amount'] == 350.0
    assert parsed['category'] == 'Food'
    assert parsed['payment_method'] == 'UPI'
