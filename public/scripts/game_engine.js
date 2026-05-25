const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Kokos şəkli (PNG-lərin yerləşəcəyi massiv)
const coconutImages = [];
for (let i = 1; i <= 6; i++) {
    const img = new Image();
    img.src = `/assets/images/coconut_${i}.png`; // Şəkilləri bu ada uyğun qovluğa qoy
    coconutImages.push(img);
}

let cocktailList = [];
let currentCocktail = null;

function createNewCocktail() {
    return {
        x: canvas.width / 2,
        y: 50,
        radius: 20,
        type: Math.floor(Math.random() * 3),
        isDropped: false
    };
}

currentCocktail = createNewCocktail();

function drawCoconut(c) {
    const img = coconutImages[c.type % coconutImages.length];
    
    // 3D Perspektiv: Aşağı düşdükcə böyüyür
    let perspectiveScale = 0.6 + (c.y / canvas.height) * 0.8;
    let size = (c.radius * 2) * perspectiveScale;

    if (img && img.complete) {
        ctx.drawImage(img, c.x - size / 2, c.y - size / 2, size, size);
    } else {
        // Şəkil yüklənməyibsə fall-back dairə
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius * perspectiveScale, 0, Math.PI * 2);
        ctx.fillStyle = "#8d6e63";
        ctx.fill();
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Düşən kokos
    if (currentCocktail) {
        drawCoconut(currentCocktail);
        if (currentCocktail.isDropped) {
            currentCocktail.y += 5;
            // Sərhəd yoxlaması
            currentCocktail.x = Math.max(60, Math.min(currentCocktail.x, canvas.width - 60));
            
            if (currentCocktail.y >= canvas.height - 50) {
                cocktailList.push(currentCocktail);
                currentCocktail = createNewCocktail();
            }
        }
    }

    // Yığılmış kokoslar
    cocktailList.forEach(c => drawCoconut(c));

    requestAnimationFrame(gameLoop);
}

canvas.addEventListener("click", (e) => {
    if (currentCocktail && !currentCocktail.isDropped) {
        const rect = canvas.getBoundingClientRect();
        currentCocktail.x = e.clientX - rect.left;
        currentCocktail.isDropped = true;
    }
});

gameLoop();
