# This file is required for Python runtime but not used for static hosting
# All requests are handled by static file handlers in app.yaml

from flask import Flask

app = Flask(__name__)

@app.route('/')
def home():
    # This should never be called due to static file handlers
    return 'Static hosting active'

if __name__ == '__main__':
    app.run(debug=True)
