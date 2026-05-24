const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let currentCoins = 2500;
let targetOrderScore = 600;
let currentScore = 0;

let cocktailList = [];
let currentCocktail = null;
const colors = ["#ff4757", "#eccc68", "#2ed573", "#1e90ff", "#ffa502", "#9b59b6", "#1dd1a1"];

function createNewCocktail() {
    return {
        x: canvas.width / 2,
        y: 40,
        radius: 15 + Math.floor(Math.random() * 10),
        type: Math.floor(Math.random() * 3),
        isDropped: false,
        speedY: 0
    };
}

currentCocktail = createNewCocktail();

function updateScoreBoard() {
    document.getElementById("coinCount").innerText = currentCoins;
    document.getElementById("targetCount").innerText = targetOrderScore;
}

canvas.addEventListener("click", function(event) {
    if (currentCocktail && !currentCocktail.isDropped) {
        const rect = canvas.getBoundingClientRect();
        currentCocktail.x = event.clientX - rect.left;
        currentCocktail.isDropped = true;
        currentCocktail.speedY = 5;
    }
});

function checkLocalCollision(c1, c2) {
    let dx = c2.x - c1.x;
    let dy = c2.y - c1.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= (c1.radius + c2.radius);
}

function handleGameMerge(index1, index2) {
    let c1 = cocktailList[index1];
    let c2 = cocktailList[index2];
    
    if (c1.type === c2.type) {
        let newType = c1.type + 1;
        let midX = (c1.x + c2.x) / 2;
        let midY = (c1.y + c2.y) / 2;
        
        cocktailList.splice(Math.max(index1, index2), 1);
        cocktailList.splice(Math.min(index1, index2), 1);
        
        cocktailList.push({
            x: midX,
            y: midY,
            radius: c1.radius + 4,
            type: newType,
            isDropped: true,
            speedY: 2
        });
        
        currentScore += newType * 50;
        currentCoins += newType * 10;
        updateScoreBoard();
        
        fetch('/api/v1/merge', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ typeA: c1.type, typeB: c2.type })
        });
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Line barrier (Sərhəd xətti)
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.moveTo(0, 100);
    ctx.lineTo(canvas.width, 100);
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.stroke();
    ctx.setLineDash([]);

    if (currentCocktail) {
        ctx.beginPath();
        ctx.arc(currentCocktail.x, currentCocktail.y, currentCocktail.radius, 0, Math.PI * 2);
        ctx.fillStyle = colors[currentCocktail.type % colors.length];
        ctx.fill();
        ctx.closePath();

        if (currentCocktail.isDropped) {
            currentCocktail.y += currentCocktail.speedY;
            if (currentCocktail.y + currentCocktail.radius >= canvas.height) {
                currentCocktail.y = canvas.height - currentCocktail.radius;
                currentCocktail.isDropped = false;
                cocktailList.push(currentCocktail);
                currentCocktail = createNewCocktail();
            } else {
                for (let i = 0; i < cocktailList.length; i++) {
                    if (checkLocalCollision(currentCocktail, cocktailList[i])) {
                        currentCocktail.y = cocktailList[i].y - currentCocktail.radius - 2;
                        cocktailList.push(currentCocktail);
                        currentCocktail = createNewCocktail();
                        break;
                    }
                }
            }
        }
    }

    for (let i = 0; i < cocktailList.length; i++) {
        let c = cocktailList[i];
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
        ctx.fillStyle = colors[c.type % colors.length];
        ctx.fill();
        ctx.closePath();
    }

    for (let i = 0; i < cocktailList.length; i++) {
        for (let j = i + 1; j < cocktailList.length; j++) {
            if (checkLocalCollision(cocktailList[i], cocktailList[j])) {
                handleGameMerge(i, j);
                break;
            }
        }
    }

    requestAnimationFrame(gameLoop);
}

document.getElementById("resetBtn").addEventListener("click", function() {
    cocktailList = [];
    currentScore = 0;
    currentCocktail = createNewCocktail();
});

document.getElementById("claimBtn").addEventListener("click", function() {
    if (currentScore >= targetOrderScore) {
        alert("🎉 Təbriklər! Sifarişi tamamladınız.");
        targetOrderScore += 200;
        updateScoreBoard();
    } else {
        alert("⚠️ Sifarişi tamamlamaq üçün kifayət qədər xal yoxdur! Hazırkı: " + currentScore);
    }
});

fetch('/api/v1/score').then(res => res.json()).then(data => {
    currentCoins = data.currentCoins;
    targetOrderScore = data.targetOrderScore;
    updateScoreBoard();
});

gameLoop();