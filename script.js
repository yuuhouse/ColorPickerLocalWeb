const hueSlider = document.getElementById("hue-slider");
const colorDisplay = document.getElementById("color-display");
const colorPreview = document.querySelector(".color-preview");
const canvas = document.getElementById("color-triangle");
const ctx = canvas.getContext("2d");
const ringCanvas = document.getElementById("color-ring");

let isDragging = false;
let currentAngle = 0;
let selectedX = null;
let selectedY = null;

// 定義新的三角形尺寸
const TRIANGLE_SIZE = 280; // 將三角形尺寸設回 280px

// 更新三角形頂點座標
const TRIANGLE_A = { x: TRIANGLE_SIZE, y: canvas.height / 2 }; // 例如 (280, 140)
const TRIANGLE_B = { x: 80, y: 240 }; // 根據比例恢復座標
const TRIANGLE_C = { x: 80, y: 40 };  // 根據比例恢復座標

// 更新畫布尺寸
canvas.width = TRIANGLE_SIZE;
canvas.height = TRIANGLE_SIZE;

// 定義常量以避免重複計算
const CENTER_X = ringCanvas.width / 2;
const CENTER_Y = ringCanvas.height / 2;
const INNER_RADIUS = (ringCanvas.width / 2) - 50; // 根據厚度調整，從 40 增加到 50
const OUTER_RADIUS = ringCanvas.width / 2;

// Remove rotation transformations from drawTriangle
function drawTriangle(hue) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  ctx.beginPath();
  // 使用更新後的三角形頂點
  ctx.moveTo(TRIANGLE_A.x, TRIANGLE_A.y);
  ctx.lineTo(TRIANGLE_B.x, TRIANGLE_B.y);
  ctx.lineTo(TRIANGLE_C.x, TRIANGLE_C.y);
  ctx.closePath();
  
  // Create gradient from white to pure color
  const gradientWhiteToColor = ctx.createLinearGradient(TRIANGLE_A.x, TRIANGLE_A.y, TRIANGLE_C.x, TRIANGLE_C.y);
  gradientWhiteToColor.addColorStop(0, "#ffffff"); // Pure white at right vertex
  gradientWhiteToColor.addColorStop(1, `hsl(${hue}, 100%, 50%)`); // Pure color at top vertex
  
  ctx.fillStyle = gradientWhiteToColor;
  ctx.fill();
  
  // Create gradient from transparent to black towards bottom vertex
  const gradientTransparentToBlack = ctx.createLinearGradient(TRIANGLE_A.x, TRIANGLE_A.y, TRIANGLE_B.x, TRIANGLE_B.y);
  gradientTransparentToBlack.addColorStop(0, "rgba(0, 0, 0, 0)"); // Transparent at right vertex
  gradientTransparentToBlack.addColorStop(1, "#000000"); // Black at bottom vertex
  
  ctx.fillStyle = gradientTransparentToBlack;
  ctx.fill();

  // Draw the selected indicator if a color has been selected
  drawTriangleIndicator(selectedX, selectedY);
}

// Function to draw an indicator on the triangle
function drawTriangleIndicator(x, y) {
  if (x === null || y === null) return;

  ctx.beginPath();
  ctx.arc(x, y, 8, 0, 2 * Math.PI); // Draw a circle with radius 8
  ctx.strokeStyle = "#000"; // Black border for visibility
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#fff"; // White fill
  ctx.fill();
}

// Update the pickColor function to remove reverse rotation
function pickColor(event) {
  const x = event.offsetX;
  const y = event.offsetY;
  
  // 使用重心坐標法檢查點是否在三角形內
  const px = x;
  const py = y;
  
  const Ax = TRIANGLE_A.x;
  const Ay = TRIANGLE_A.y;
  const Bx = TRIANGLE_B.x;
  const By = TRIANGLE_B.y;
  const Cx = TRIANGLE_C.x;
  const Cy = TRIANGLE_C.y;
  
  const areaOrig = Math.abs((Bx - Ax) * (Cy - Ay) - (Cx - Ax) * (By - Ay));
  const area1 = Math.abs((Ax - px) * (By - py) - (Bx - px) * (Ay - py));
  const area2 = Math.abs((Bx - px) * (Cy - py) - (Cx - px) * (By - py));
  const area3 = Math.abs((Cx - px) * (Ay - py) - (Ax - px) * (Cy - py));
  
  const isInside = (area1 + area2 + area3) <= areaOrig;
  
  if (!isInside) {
    return;
  }
  
  const imageData = ctx.getImageData(x, y, 1, 1).data;

  const [r, g, b] = imageData;
  const hexColor = `#${((1 << 24) + (r << 16) + (g << 8) + b)
    .toString(16)
    .slice(1)}`;

  colorDisplay.value = hexColor;
  colorPreview.style.background = hexColor;

  // Update selected position
  selectedX = x;
  selectedY = y;

  // Redraw triangle and indicators
  drawTriangle(currentAngle);
  drawRing();
  drawRingIndicator(currentAngle);
}

// Function to check if a point is within the color ring
function isPointInRing(x, y, innerRadius, outerRadius) {
  const distance = Math.sqrt(x * x + y * y);
  return distance >= innerRadius && distance <= outerRadius;
}

// Update the updateHue function to allow hue selection regardless of pointer position
function updateHue(event) {
  const rect = ringCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left - CENTER_X;
  const y = event.clientY - rect.top - CENTER_Y;
  
  // Calculate the angle based on cursor position
  let angle = Math.atan2(y, x) * (180 / Math.PI);
  if (angle < 0) angle += 360;
  
  currentAngle = angle;
  drawTriangle(angle);
  drawRing();
  drawRingIndicator(angle);
}

function drawRing() {
  const ringCtx = ringCanvas.getContext("2d");
  ringCtx.clearRect(0, 0, ringCanvas.width, ringCanvas.height);
  const radius = ringCanvas.width / 2;
  const thickness = 50; // 將環的厚度從 40 增加到 50
  ringCtx.lineWidth = thickness; // 設定線條寬度

  for (let angle = 0; angle < 360; angle++) {
    ringCtx.beginPath();
    ringCtx.strokeStyle = `hsl(${angle}, 100%, 50%)`;
    ringCtx.arc(radius, radius, radius - thickness / 2, (angle * Math.PI)/180, ((angle + 1)*Math.PI)/180);
    ringCtx.stroke();
  }
}

function drawRingIndicator(angle) {
  const ringCtx = ringCanvas.getContext("2d");
  const radius = ringCanvas.width / 2;
  const thickness = 50; // 保持與繪製環的厚度一致
  // 將角度轉為弧度
  const rad = (angle * Math.PI) / 180;
  const dotX = radius + (radius - thickness / 2 - 10) * Math.cos(rad);
  const dotY = radius + (radius - thickness / 2 - 10) * Math.sin(rad);
  ringCtx.beginPath();
  ringCtx.fillStyle = "#fff";
  ringCtx.arc(dotX, dotY, 8, 0, 2 * Math.PI); // 保持指示點的尺寸
  ringCtx.fill();
}

// Add a separate click event listener for the color ring
ringCanvas.addEventListener("click", (e) => {
  updateHue(e);
});

// Modify the mousedown event to start dragging without ring boundary check
ringCanvas.addEventListener("mousedown", (e) => {
  isDragging = true;
  updateHue(e);
});

// Ensure the dragging state doesn't interfere with click events
window.addEventListener("mouseup", () => {
  isDragging = false;
});

// Optional: Throttle the mousemove event for performance
let throttleTimeout = null;
window.addEventListener("mousemove", (e) => {
  if (isDragging) {
    if (!throttleTimeout) {
      throttleTimeout = setTimeout(() => {
        updateHue(e);
        throttleTimeout = null;
      }, 16); // 約60fps
    }
  }
});

canvas.addEventListener("click", pickColor);

// Initial drawing
drawTriangle(0);

drawRing();
