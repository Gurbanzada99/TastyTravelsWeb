#ifndef PHYSICS_ENGINE_H
#define PHYSICS_ENGINE_H

extern "C" {
    bool checkCocktailCollision(double x1, double y1, double r1, double x2, double y2, double r2);
    int mergeCocktails(int itemTypeA, int itemTypeB);
}

#endif