#include "physics_engine.h"
#include <cmath>

extern "C" {
    bool checkCocktailCollision(double x1, double y1, double r1, double x2, double y2, double r2) {
        double distance = std::sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
        return distance <= (r1 + r2);
    }

    int mergeCocktails(int itemTypeA, int itemTypeB) {
        if (itemTypeA == itemTypeB) {
            return itemTypeA + 1;
        }
        return 0;
    }
}