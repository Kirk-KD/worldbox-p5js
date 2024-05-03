from flask import Flask, send_from_directory

app = Flask(__name__)


# @app.route('/src/<path:path>', methods=['GET'])
# def get_src(path):
#     return send_from_directory('src', path)


@app.route('/<path:path>', methods=['GET'])
def get_file(path):
    return send_from_directory('.', path)


if __name__ == '__main__':
    app.run(debug=True)
