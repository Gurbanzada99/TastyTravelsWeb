const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let currentCoins = 2500;
let targetOrderScore = 600;
let currentScore = 0;

let cocktailList = [];
let currentCocktail = null;

// Sərhədləri təyin edən köməkçi funksiya
function getConstrainedX(x, radius) {
    const leftLimit = 60 + radius;
    const rightLimit = canvas.width - 60 - radius;
    return Math.max(leftLimit, Math.min(x, rightLimit));
}

const cocktailStyles = [
    { liquid: "#ff4757", top: "#ff6b81", fruit: "🍒" },
    { liquid: "#ffa502", top: "#ff7f50", fruit: "🍊" },
    { liquid: "#2ed573", top: "#26de81", fruit: "🍏" },
    { liquid: "#1e90ff", top: "#70a1ff", fruit: "🍋" },
    { liquid: "#9b59b6", top: "#a55eea", fruit: "🍇" },
    { liquid: "#ff6348", top: "#ff7f50", fruit: "🍓" }
];

function createNewCocktail() {
    return {
        x: getConstrainedX(canvas.width / 2, 20),
        y: 45,
        radius: 18 + Math.floor(Math.random() * 8),
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
        let rawX = event.clientX - rect.left;
        currentCocktail.x = getConstrainedX(rawX, currentCocktail.radius);
        currentCocktail.isDropped = true;
        currentCocktail.speedY = 6;
    }
});

function checkLocalCollision(c1, c2) {
    let dx = c2.x - c1.x;
    let dy = c2.y - c1.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= (c1.radius + c2.radius);
}

function drawPremiumGlass(x, y, radius, type) {
    const style = cocktailStyles[type % cocktailStyles.length];
    ctx.save();
    
    // Kölgə
    ctx.beginPath();
    ctx.ellipse(x, y + radius, radius * 0.8, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
    ctx.fill();
    ctx.closePath();

    // Maye
    ctx.beginPath();
    ctx.arc(x, y, radius - 2, 0, Math.PI, false);
    ctx.lineTo(x - radius + 2, y);
    ctx.fillStyle = style.liquid;
    ctx.fill();
    ctx.closePath();

    // Üst hissə
    ctx.beginPath();
    ctx.ellipse(x, y, radius - 2, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = style.top;
    ctx.fill();
    ctx.closePath();

    // Şüşə kənarları
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.stroke();
    
    // Meyvə
    ctx.font = `${radius * 0.9}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(style.fruit, x, y - 4);
    ctx.restore();
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
        cocktailList.push({ x: midX, y: midY, radius: c1.radius + 3, type: newType, isDropped: true, speedY: 3 });
        currentScore += newType * 50;
        updateScoreBoard();
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (currentCocktail) {
        drawPremiumGlass(currentCocktail.x, currentCocktail.y, currentCocktail.radius, currentCocktail.type);
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

    cocktailList.forEach(c => drawPremiumGlass(c.x, c.y, c.radius, c.type));
    
    for (let i = 0; i < cocktailList.length; i++) {
        for (let j = i + 1; j < cocktailList.length; j++) {
            if (checkLocalCollision(cocktailList[i], cocktailList[j])) {
                handleGameMerge(i, j);
            }
        }
    }
    requestAnimationFrame(gameLoop);
}

gameLoop();
