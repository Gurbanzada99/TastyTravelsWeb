import json
import os

class GameScoreManager:
    def __init__(self, dbPath="database/game_state.json"):
        self.dbPath = dbPath
        self.gameState = {}
        self.loadGameState()

    def loadGameState(self):
        if os.path.exists(self.dbPath):
            with open(self.dbPath, "r", encoding="utf-8") as file:
                self.gameState = json.load(file)
        else:
            self.gameState = {
                "currentCoins": 2500,
                "targetOrderScore": 600,
                "currentLevel": 1
            }
            self.saveGameState()

    def saveGameState(self):
        os.makedirs(os.path.dirname(self.dbPath), exist_ok=True)
        with open(self.dbPath, "w", encoding="utf-8") as file:
            json.dump(self.gameState, file, ensure_ascii=False, indent=4)

    def addCoinsAfterMerge(self, earnedAmount):
        self.gameState["currentCoins"] += int(earnedAmount)
        self.saveGameState()
        return self.gameState["currentCoins"]

    def checkOrderCompletion(self, currentTableScore):
        if currentTableScore >= self.gameState["targetOrderScore"]:
            self.gameState["currentLevel"] += 1
            self.gameState["targetOrderScore"] += 200
            self.saveGameState()
            return True
        return False