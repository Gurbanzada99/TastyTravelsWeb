const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let currentCoins = 2500;
let targetOrderScore = 600;
let currentScore = 0;

let cocktailList = [];
let currentCocktail = null;

const cocktailStyles = [
    { liquid: "#ff4757", top: "#ff6b81", fruit: "🍒" },
    { liquid: "#ffa502", top: "#ff7f50", fruit: "🍊" },
    { liquid: "#2ed573", top: "#26de81", fruit: "🍏" },
    { liquid: "#1e90ff", top: "#70a1ff", fruit: "🍋" },
    { liquid: "#9b59b6", top: "#a55eea", fruit: "🍇" },
    { liquid: "#ff6348", top: "#ff7f50", fruit: "🍓" }
];

// 1. Yeni kokteyl aşağıdan (y = 550) çıxır
function createNewCocktail() {
    return {
        x: canvas.width / 2,
        y: 550, 
        radius: 22,
        type: Math.floor(Math.random() * 3),
        isLaunched: false,
        speedY: -5 // Mənfi rəqəm = yuxarı hərəkət
    };
}

currentCocktail = createNewCocktail();

function updateScoreBoard() {
    document.getElementById("coinCount").innerText = currentCoins;
    document.getElementById("targetCount").innerText = targetOrderScore;
}

// 2. Klikləyəndə aşağıdan yuxarıya atılır
canvas.addEventListener("click", function(event) {
    if (currentCocktail && !currentCocktail.isLaunched) {
        const rect = canvas.getBoundingClientRect();
        let rawX = event.clientX - rect.left;
        // Sərhədləmə
        currentCocktail.x = Math.max(60 + currentCocktail.radius, Math.min(rawX, canvas.width - 60 - currentCocktail.radius));
        currentCocktail.isLaunched = true;
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
    
    // Alt Kölgə
    ctx.beginPath();
    ctx.ellipse(x, y + radius, radius * 0.8, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fill();
    ctx.closePath();

    // Kokteyl gövdəsi
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = style.liquid;
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();

    // Meyvə
    ctx.font = `${radius}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(style.fruit, x, y);
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
        cocktailList.push({ x: midX, y: midY, radius: c1.radius + 2, type: newType, isLaunched: true, speedY: 0 });
        currentScore += newType * 50;
        updateScoreBoard();
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Aşağıdan yuxarı hərəkət məntiqi
    if (currentCocktail) {
        drawPremiumGlass(currentCocktail.x, currentCocktail.y, currentCocktail.radius, currentCocktail.type);
        if (currentCocktail.isLaunched) {
            currentCocktail.y += currentCocktail.speedY;
            
            // Yuxarı sərhədə (150) çatanda dayanır
            if (currentCocktail.y <= 150) {
                currentCocktail.y = 150;
                currentCocktail.isLaunched = false;
                cocktailList.push(currentCocktail);
                currentCocktail = createNewCocktail();
            } else {
                for (let i = 0; i < cocktailList.length; i++) {
                    if (checkLocalCollision(currentCocktail, cocktailList[i])) {
                        currentCocktail.y = cocktailList[i].y + currentCocktail.radius + 10;
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
