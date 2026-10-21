import pytest

def test_health_check(client):
    res = client.get('/api/health')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'ok'

def test_login_success(client):
    res = client.post('/api/auth/login', json={
        'email': 'student@test.com',
        'password': 'student123'
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert 'token' in data['data']
    assert data['data']['user']['role'] == 'student'
    assert data['data']['user']['name'] == 'Test Student'

def test_login_invalid_password(client):
    res = client.post('/api/auth/login', json={
        'email': 'student@test.com',
        'password': 'wrongpassword'
    })
    assert res.status_code == 401
    data = res.get_json()
    assert data['success'] is False

def test_login_missing_fields(client):
    res = client.post('/api/auth/login', json={
        'email': 'student@test.com'
    })
    assert res.status_code == 400

def test_signup_student(client):
    res = client.post('/api/auth/register', json={
        'name': 'New Student',
        'email': 'newstudent@test.com',
        'password': 'password123',
        'role': 'student'
    })
    assert res.status_code == 201
    data = res.get_json()
    assert data['success'] is True
    assert data['data']['user']['email'] == 'newstudent@test.com'
    assert data['data']['user']['role'] == 'student'

def test_signup_existing_email(client):
    res = client.post('/api/auth/register', json={
        'name': 'Duplicate',
        'email': 'student@test.com',
        'password': 'password123',
        'role': 'student'
    })
    assert res.status_code == 409

def test_get_me(client, student_auth_headers):
    res = client.get('/api/auth/me', headers=student_auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert data['data']['email'] == 'student@test.com'

def test_unauthorized_access(client):
    res = client.get('/api/auth/me')
    assert res.status_code == 401

def test_signup_validation_short_password(client):
    res = client.post('/api/auth/register', json={
        'name': 'Short Pass',
        'email': 'shortpass@test.com',
        'password': '123',
        'role': 'student'
    })
    assert res.status_code == 400
    data = res.get_json()
    assert data['success'] is False
    assert 'password' in data['error']['fields']

def test_signup_validation_invalid_email(client):
    res = client.post('/api/auth/register', json={
        'name': 'Bad Email',
        'email': 'not-an-email',
        'password': 'password123',
        'role': 'student'
    })
    assert res.status_code == 400
    data = res.get_json()
    assert data['success'] is False
    assert 'email' in data['error']['fields']

def test_signup_validation_invalid_role(client):
    res = client.post('/api/auth/register', json={
        'name': 'Alien',
        'email': 'alien@test.com',
        'password': 'password123',
        'role': 'superhero'
    })
    assert res.status_code == 400
    data = res.get_json()
    assert data['success'] is False
    assert 'role' in data['error']['fields']

def test_check_email_endpoint(client):
    # Already taken email
    res1 = client.get('/api/auth/check-email?email=student@test.com')
    assert res1.status_code == 200
    data1 = res1.get_json()
    assert data1['data']['available'] is False

    # Available email
    res2 = client.get('/api/auth/check-email?email=completely_fresh@test.com')
    assert res2.status_code == 200
    data2 = res2.get_json()
    assert data2['data']['available'] is True

def test_signup_initializes_user_workspace(client):
    res = client.post('/api/auth/register', json={
        'name': 'Priya Sharma',
        'email': 'priya@test.com',
        'password': 'securepassword123',
        'role': 'professional',
        'monthly_allowance': 90000.0
    })
    assert res.status_code == 201
    token = res.get_json()['data']['token']
    headers = {'Authorization': f'Bearer {token}'}

    # Verify emergency fund was created
    ef_res = client.get('/api/emergency-fund', headers=headers)
    assert ef_res.status_code == 200
    ef_data = ef_res.get_json()
    assert ef_data['data']['fund']['current'] == 0.0

    # Verify starter budgets were created
    budget_res = client.get('/api/budgets', headers=headers)
    assert budget_res.status_code == 200
    b_data = budget_res.get_json()
    assert len(b_data['data']['categories']) >= 4

    # Verify professional dashboard loads smoothly without errors
    dash_res = client.get('/api/dashboard/professional', headers=headers)
    assert dash_res.status_code == 200

def test_login_case_insensitive(client):
    res = client.post('/api/auth/login', json={
        'email': 'STUDENT@TEST.COM',
        'password': 'student123'
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert data['data']['user']['email'] == 'student@test.com'

