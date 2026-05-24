import os
import ctypes
from flask import Flask, jsonify, request, send_from_directory
from score_manager import GameScoreManager

app = Flask(__name__, static_folder='../public')
scoreEngine = GameScoreManager()

try:
    physicsPath = os.path.abspath("src_core/physics_engine.so")
    if os.path.exists(physicsPath):
        physicsLib = ctypes.CDLL(physicsPath)
        physicsLib.checkCocktailCollision.argtypes = [ctypes.c_double, ctypes.c_double, ctypes.c_double, ctypes.c_double, ctypes.c_double, ctypes.c_double]
        physicsLib.checkCocktailCollision.restype = ctypes.c_bool
        physicsLib.mergeCocktails.argtypes = [ctypes.c_int, ctypes.c_int]
        physicsLib.mergeCocktails.restype = ctypes.c_int
    else:
        physicsLib = None
except Exception as error:
    physicsLib = None

@app.route('/')
def serveGame():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serveStatic(path):
    return send_from_directory(app.static_folder, path)

@app.route('/api/v1/score', methods=['GET'])
def getUserScore():
    return jsonify(scoreEngine.gameState)

@app.route('/api/v1/merge', methods=['POST'])
def processMerge():
    requestData = request.json
    typeA = requestData.get("typeA", 0)
    typeB = requestData.get("typeB", 0)
    
    if physicsLib:
        nextType = physicsLib.mergeCocktails(typeA, typeB)
    else:
        nextType = (typeA + 1) if typeA == typeB else 0
        
    if nextType > 0:
        reward = nextType * 10
        scoreEngine.addCoinsAfterMerge(reward)
        
    return jsonify({
        "nextType": nextType,
        "currentCoins": scoreEngine.gameState["currentCoins"]
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)