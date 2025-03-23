from flask import Flask, jsonify
import requests
from bs4 import BeautifulSoup

app = Flask(__name__)
session = None

def login():
    global session
    session = requests.Session()
    login_url = "https://www.erawancenter.bangkok.go.th/login"

    response = session.get(login_url)
    soup = BeautifulSoup(response.text, "html.parser")

    csrf_token_input = soup.find("input", {"name": "_token"})
    if csrf_token_input:
        csrf_token = csrf_token_input["value"]
    else:
        return None

    payload = {
        '_token': csrf_token,
        'u_username': '3100200563169',
        'password': '12345678',
        'sio': ''
    }

    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://www.erawancenter.bangkok.go.th',
        'Referer': login_url,
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    }

    response = session.post(login_url, headers=headers, data=payload, allow_redirects=True)

    if "laravel_session" in session.cookies:
        print("Login successful!")
        return session
    else:
        print("Login failed!")
        return None


def get_data():
    global session

    if session is None:
        session = login()
        if session is None:
            return {"message": "Login failed. Check credentials."}, 401

    data_url = "https://www.erawancenter.bangkok.go.th/command-datatable?draw=1&columns%5B0%5D%5Bdata%5D=RC_DATE&columns%5B1%5D%5Bdata%5D=RC_TIME&columns%5B2%5D%5Bdata%5D=RC_POINT&columns%5B3%5D%5Bdata%5D=CAL_TEL&columns%5B4%5D%5Bdata%5D=RC_PRIMARYILLNESS&columns%5B5%5D%5Bdata%5D=USER_CALLER&order%5B0%5D%5Bcolumn%5D=0&order%5B0%5D%5Bdir%5D=desc&order%5B1%5D%5Bcolumn%5D=1&order%5B1%5D%5Bdir%5D=desc&start=0&length=10&tab=calltaker&type=calltaker"

    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
        'Accept': 'application/json'
    }

    response = session.get(data_url, headers=headers)

    if response.status_code in [401, 403] or "login" in response.url:
        print("Session expired, re-logging in...")
        session = login()
        if session is None:
            return {"message": "Re-login failed. Check credentials."}, 401

        response = session.get(data_url, headers=headers)

    if response.status_code == 200:
        return response.json(), 200
    else:
        return {"message": "Failed to retrieve data", "status_code": response.status_code}, response.status_code

@app.route('/')
def playground():
    data, status_code = get_data()
    return jsonify(data), status_code

if __name__ == '__main__':
    app.run(debug=True)
