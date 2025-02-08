// Глобальные переменные
let currentImage = null;
const baseFontSize = 7; // Базовый размер шрифта для ASCII искусства

// Помощник функций
// Ограничить значение между минимумом и максимумом.
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
// Сгенерировать нормализованное 2D ядро Гаусса.
function gaussianKernel2D(sigma, kernelSize) {
  const kernel = [];
  const half = Math.floor(kernelSize / 2);
  let sum = 0;
  for (let y = -half; y <= half; y++) {
    const row = [];
    for (let x = -half; x <= half; x++) {
      const value = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
      row.push(value);
      sum += value;
    }
    kernel.push(row);
  }
  // Нормализовать ядро.
  for (let y = 0; y < kernelSize; y++) {
    for (let x = 0; x < kernelSize; x++) {
      kernel[y][x] /= sum;
    }
  }
  return kernel;
}
// Свернуть 2D изображение (массив) с 2D ядром.
function convolve2D(img, kernel) {
  const height = img.length,
    width = img[0].length;
  const kernelSize = kernel.length,
    half = Math.floor(kernelSize / 2);
  const output = [];
  for (let y = 0; y < height; y++) {
    output[y] = [];
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let ky = 0; ky < kernelSize; ky++) {
    for (let kx = 0; kx < kernelSize; kx++) {
      const yy = y + ky - half;
      const xx = x + kx - half;
      let pixel = (yy >= 0 && yy < height && xx >= 0 && xx < width) ? img[yy][xx] : 0;
      sum += pixel * kernel[ky][kx];
    }
      }
      output[y][x] = sum;
    }
  }
  return output;
}
// Применить оператор Sobel к 2D изображению, возвращая массивы величины градиента и угла.
function applySobel2D(img, width, height) {
  const mag = [],
    angle = [];
  for (let y = 0; y < height; y++) {
    mag[y] = [];
    angle[y] = [];
    for (let x = 0; x < width; x++) {
      mag[y][x] = 0;
      angle[y][x] = 0;
    }
  }
  const kernelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
  const kernelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let Gx = 0, Gy = 0;
      for (let ky = -1; ky <= 1; ky++) {
    for (let kx = -1; kx <= 1; kx++) {
      const pixel = img[y + ky][x + kx];
      Gx += pixel * kernelX[ky + 1][kx + 1];
      Gy += pixel * kernelY[ky + 1][kx + 1];
    }
      }
      const g = Math.sqrt(Gx * Gx + Gy * Gy);
      mag[y][x] = g;
      let theta = Math.atan2(Gy, Gx) * (180 / Math.PI);
      if (theta < 0) theta += 180;
      angle[y][x] = theta;
    }
  }
  return { mag, angle };
}
// Подавление не-максимумов для прореживания границ.
function nonMaxSuppression(mag, angle, width, height) {
  const suppressed = [];
  for (let y = 0; y < height; y++) {
    suppressed[y] = [];
    for (let x = 0; x < width; x++) {
      suppressed[y][x] = 0;
    }
  }
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const currentMagnitude = mag[y][x];
      let neighbor1 = 0, neighbor2 = 0;
      const angleValue = angle[y][x];
      if ((angleValue >= 0 && angleValue < 22.5) || (angleValue >= 157.5 && angleValue <= 180)) {
    // Направление 0°: сравниваем левое и правое.
    neighbor1 = mag[y][x - 1];
    neighbor2 = mag[y][x + 1];
      } else if (angleValue >= 22.5 && angleValue < 67.5) {
    // Направление 45°: сравниваем верхне-правое и нижне-левое.
    neighbor1 = mag[y - 1][x + 1];
    neighbor2 = mag[y + 1][x - 1];
      } else if (angleValue >= 67.5 && angleValue < 112.5) {
    // Направление 90°: сравниваем верхнее и нижнее.
    neighbor1 = mag[y - 1][x];
    neighbor2 = mag[y + 1][x];
      } else if (angleValue >= 112.5 && angleValue < 157.5) {
    // Направление 135°: сравниваем верхне-левое и нижне-правое.
    neighbor1 = mag[y - 1][x - 1];
    neighbor2 = mag[y + 1][x + 1];
      }
      suppressed[y][x] = (currentMagnitude >= neighbor1 && currentMagnitude >= neighbor2) ? currentMagnitude : 0;
    }
  }
  return suppressed;
}
// Функции генерации ASCII искусства
// Генерация стандартного ASCII искусства (без режима DoG).
function generateASCII(img) {
  const edgeMethod = document.querySelector('input[name="edgeMethod"]:checked').value;
  if (edgeMethod === 'dog') {
    generateContourASCII(img);
    return;
  }
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const asciiWidth = parseInt(document.getElementById('asciiWidth').value, 10);
  const brightness = parseFloat(document.getElementById('brightness').value);
  const contrast = parseFloat(document.getElementById('contrast').value);
  const blur = parseFloat(document.getElementById('blur').value);
  const enableDithering = document.getElementById('dithering').checked;
  const ditherAlgorithm = document.getElementById('ditherAlgorithm').value;
  const invert = document.getElementById('invert').checked;
  const ignoreWhite = document.getElementById('ignoreWhite').checked;
  const charset = document.getElementById('charset').value;
  let gradient;
  switch (charset) {
    case 'standard': gradient = "@%#*+=-:."; break;
    case 'blocks': gradient = "█▓▒░ "; break;
    case 'binary': gradient = "01"; break;
    case 'manual':
      const manualChar = document.getElementById('manualCharInput').value || "0";
      gradient = manualChar + " ";
      break;
    case 'hex': gradient = "0123456789ABCDEF"; break;
    case 'detailed':
    default: gradient = "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'.";
      break;
  }
  const levels = gradient.length;
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const fontRatio = 0.55;
  const asciiHeight = Math.round((img.height / img.width) * asciiWidth * fontRatio);
  canvas.width = asciiWidth;
  canvas.height = asciiHeight;
  ctx.filter = blur > 0 ? `blur(${blur}px)` : "none";
  ctx.drawImage(img, 0, 0, asciiWidth, asciiHeight);
  const imageData = ctx.getImageData(0, 0, asciiWidth, asciiHeight);
  const data = imageData.data;
  let gray = [], grayOriginal = [];
  for (let i = 0; i < data.length; i += 4) {
    let lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (invert) lum = 255 - lum;
    let adjusted = clamp(contrastFactor * (lum - 128) + 128 + brightness, 0, 255);
    gray.push(adjusted);
    grayOriginal.push(adjusted);
  }
  let ascii = "";
  if (edgeMethod === 'sobel') {
    const threshold = parseInt(document.getElementById('edgeThreshold').value, 10);
    gray = applyEdgeDetection(gray, asciiWidth, asciiHeight, threshold);
    for (let y = 0; y < asciiHeight; y++) {
      let line = "";
      for (let x = 0; x < asciiWidth; x++) {
    const idx = y * asciiWidth + x;
    if (ignoreWhite && grayOriginal[idx] === 255) {
      line += " ";
      continue;
    }
    const computedLevel = Math.round((gray[idx] / 255) * (levels - 1));
    line += gradient.charAt(computedLevel);
      }
      ascii += line + "\n";
    }
  } else if (enableDithering) {
    if (ditherAlgorithm === 'floyd') {
      // Floyd–Steinberg дифферинг
      for (let y = 0; y < asciiHeight; y++) {
    let line = "";
    for (let x = 0; x < asciiWidth; x++) {
      const idx = y * asciiWidth + x;
      if (ignoreWhite && grayOriginal[idx] === 255) { line += " "; continue; }
      let computedLevel = Math.round((gray[idx] / 255) * (levels - 1));
      line += gradient.charAt(computedLevel);
      const newPixel = (computedLevel / (levels - 1)) * 255;
      const error = gray[idx] - newPixel;
      if (x + 1 < asciiWidth) { 
        gray[idx + 1] = clamp(gray[idx + 1] + error * (7 / 16), 0, 255); 
      }
      if (x - 1 >= 0 && y + 1 < asciiHeight) { 
        gray[idx - 1 + asciiWidth] = clamp(gray[idx - 1 + asciiWidth] + error * (3 / 16), 0, 255); 
      }
      if (y + 1 < asciiHeight) { 
        gray[idx + asciiWidth] = clamp(gray[idx + asciiWidth] + error * (5 / 16), 0, 255); 
      }
      if (x + 1 < asciiWidth && y + 1 < asciiHeight) { 
        gray[idx + asciiWidth + 1] = clamp(gray[idx + asciiWidth + 1] + error * (1 / 16), 0, 255); 
      }
    }
    ascii += line + "\n";
      }
    } else if (ditherAlgorithm === 'atkinson') {
      // Atkinson дифферинг
      for (let y = 0; y < asciiHeight; y++) {
    let line = "";
    for (let x = 0; x < asciiWidth; x++) {
      const idx = y * asciiWidth + x;
      if (ignoreWhite && grayOriginal[idx] === 255) { line += " "; continue; }
      let computedLevel = Math.round((gray[idx] / 255) * (levels - 1));
      line += gradient.charAt(computedLevel);
      const newPixel = (computedLevel / (levels - 1)) * 255;
      const error = gray[idx] - newPixel;
      const diffusion = error / 8;
      if (x + 1 < asciiWidth) { 
        gray[idx + 1] = clamp(gray[idx + 1] + diffusion, 0, 255); 
      }
      if (x + 2 < asciiWidth) { 
        gray[idx + 2] = clamp(gray[idx + 2] + diffusion, 0, 255); 
      }
      if (y + 1 < asciiHeight) {
        if (x - 1 >= 0) { 
          gray[idx - 1 + asciiWidth] = clamp(gray[idx - 1 + asciiWidth] + diffusion, 0, 255); 
        }
        gray[idx + asciiWidth] = clamp(gray[idx + asciiWidth] + diffusion, 0, 255);
        if (x + 1 < asciiWidth) { 
          gray[idx + asciiWidth + 1] = clamp(gray[idx + asciiWidth + 1] + diffusion, 0, 255); 
        }
      }
      if (y + 2 < asciiHeight) { 
        gray[idx + 2 * asciiWidth] = clamp(gray[idx + 2 * asciiWidth] + diffusion, 0, 255); 
      }
    }
    ascii += line + "\n";
      }
    } else if (ditherAlgorithm === 'noise') {
      // Noise дифферинг
      for (let y = 0; y < asciiHeight; y++) {
    let line = "";
    for (let x = 0; x < asciiWidth; x++) {
      const idx = y * asciiWidth + x;
      if (ignoreWhite && grayOriginal[idx] === 255) { line += " "; continue; }
      const noise = (Math.random() - 0.5) * (255 / levels);
      const noisyValue = clamp(gray[idx] + noise, 0, 255);
      let computedLevel = Math.round((noisyValue / 255) * (levels - 1));
      line += gradient.charAt(computedLevel);
    }
    ascii += line + "\n";
      }
    } else if (ditherAlgorithm === 'ordered') {
      // Упорядоченный дифферинг с использованием матрицы Bayer 4x4.
      const bayer = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5]
      ];
      const matrixSize = 4;
      for (let y = 0; y < asciiHeight; y++) {
    let line = "";
    for (let x = 0; x < asciiWidth; x++) {
      const idx = y * asciiWidth + x;
      if (ignoreWhite && grayOriginal[idx] === 255) { line += " "; continue; }
      const p = gray[idx] / 255;
      const t = (bayer[y % matrixSize][x % matrixSize] + 0.5) / (matrixSize * matrixSize);
      let valueWithDither = p + t - 0.5;
      valueWithDither = Math.min(Math.max(valueWithDither, 0), 1);
      let computedLevel = Math.floor(valueWithDither * levels);
      if (computedLevel >= levels) computedLevel = levels - 1;
      line += gradient.charAt(computedLevel);
    }
    ascii += line + "\n";
      }
    }
  } else {
    // Простое отображение без дифферинга.
    for (let y = 0; y < asciiHeight; y++) {
      let line = "";
      for (let x = 0; x < asciiWidth; x++) {
    const idx = y * asciiWidth + x;
    if (ignoreWhite && grayOriginal[idx] === 255) { line += " "; continue; }
    const computedLevel = Math.round((gray[idx] / 255) * (levels - 1));
    line += gradient.charAt(computedLevel);
      }
      ascii += line + "\n";
    }
  }
  document.getElementById('ascii-art').textContent = ascii;
}
// Применить простое обнаружение границ Sobel к одномерному массиву оттенков серого.
function applyEdgeDetection(gray, width, height, threshold) {
  let edges = new Array(width * height).fill(255);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let idx = y * width + x;
      let a = gray[(y - 1) * width + (x - 1)];
      let b = gray[(y - 1) * width + x];
      let c = gray[(y - 1) * width + (x + 1)];
      let d = gray[y * width + (x - 1)];
      let e = gray[y * width + x];
      let f = gray[y * width + (x + 1)];
      let g = gray[(y + 1) * width + (x - 1)];
      let h = gray[(y + 1) * width + x];
      let i = gray[(y + 1) * width + (x + 1)];
      let Gx = (-1 * a) + (0 * b) + (1 * c) +
    (-2 * d) + (0 * e) + (2 * f) +
    (-1 * g) + (0 * h) + (1 * i);
      let Gy = (-1 * a) + (-2 * b) + (-1 * c) +
    (0 * d) + (0 * e) + (0 * f) +
    (1 * g) + (2 * h) + (1 * i);
      let magVal = Math.sqrt(Gx * Gx + Gy * Gy);
      let normalized = (magVal / 1442) * 255;
      edges[idx] = normalized > threshold ? 0 : 255;
    }
  }
  return edges;
}
// Генерация контурного ASCII искусства с использованием DoG и Sobel с подавлением не-максимумов.
function generateContourASCII(img) {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const asciiWidth = parseInt(document.getElementById('asciiWidth').value, 10);
  const brightness = parseFloat(document.getElementById('brightness').value);
  const contrast = parseFloat(document.getElementById('contrast').value);
  const blur = parseFloat(document.getElementById('blur').value);
  const invert = document.getElementById('invert').checked;
  const fontRatio = 0.55;
  const asciiHeight = Math.round((img.height / img.width) * asciiWidth * fontRatio);
  canvas.width = asciiWidth;
  canvas.height = asciiHeight;
  ctx.filter = blur > 0 ? `blur(${blur}px)` : "none";
  ctx.drawImage(img, 0, 0, asciiWidth, asciiHeight);
  const imageData = ctx.getImageData(0, 0, asciiWidth, asciiHeight);
  const data = imageData.data;
  let gray2d = [];
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let y = 0; y < asciiHeight; y++) {
    gray2d[y] = [];
    for (let x = 0; x < asciiWidth; x++) {
      const idx = (y * asciiWidth + x) * 4;
      let lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      if (invert) lum = 255 - lum;
      lum = clamp(contrastFactor * (lum - 128) + 128 + brightness, 0, 255);
      gray2d[y][x] = lum;
    }
  }
  const sigma1 = 0.5, sigma2 = 1.0, kernelSize = 3;
  const dog = differenceOfGaussians2D(gray2d, sigma1, sigma2, kernelSize);
  const { mag, angle } = applySobel2D(dog, asciiWidth, asciiHeight);
  const suppressedMag = nonMaxSuppression(mag, angle, asciiWidth, asciiHeight);
  const threshold = parseInt(document.getElementById('dogEdgeThreshold').value, 10);
  let ascii = "";
  for (let y = 0; y < asciiHeight; y++) {
    let line = "";
    for (let x = 0; x < asciiWidth; x++) {
      if (suppressedMag[y][x] > threshold) {
    let adjustedAngle = (angle[y][x] + 90) % 180;
    let edgeChar = (adjustedAngle < 22.5 || adjustedAngle >= 157.5) ? "-" :
      (adjustedAngle < 67.5) ? "/" :
      (adjustedAngle < 112.5) ? "|" : "\\";
    line += edgeChar;
      } else {
    line += " ";
      }
    }
    ascii += line + "\n";
  }
  document.getElementById('ascii-art').textContent = ascii;
}

// Вычислить Difference of Gaussians для 2D изображения в оттенках серого.
function differenceOfGaussians2D(gray, sigma1, sigma2, kernelSize) {
  const kernel1 = gaussianKernel2D(sigma1, kernelSize);
  const kernel2 = gaussianKernel2D(sigma2, kernelSize);
  const blurred1 = convolve2D(gray, kernel1);
  const blurred2 = convolve2D(gray, kernel2);
  const height = gray.length,
        width = gray[0].length;
  const dog = [];
  for (let y = 0; y < height; y++) {
    dog[y] = [];
    for (let x = 0; x < width; x++) {
      dog[y][x] = blurred1[y][x] - blurred2[y][x];
    }
  }
  return dog;
}

// Функция скачивания PNG
function downloadPNG() {
  const preElement = document.getElementById('ascii-art');
  const asciiText = preElement.textContent;
  if (!asciiText.trim()) {
    alert("Нет ASCII искусства для скачивания.");
    return;
  }

  const lines = asciiText.split("\n");
  const scaleFactor = 2;
  const borderMargin = 20 * scaleFactor;

  const computedStyle = window.getComputedStyle(preElement);
  const baseFontSize = parseInt(computedStyle.fontSize, 10);
  const fontSize = baseFontSize * scaleFactor;

  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.font = `${fontSize}px Consolas, Monaco, "Liberation Mono", monospace`;

  let maxLineWidth = 0;
  for (let i = 0; i < lines.length; i++) {
    const lineWidth = tempCtx.measureText(lines[i]).width;
    if (lineWidth > maxLineWidth) {
      maxLineWidth = lineWidth;
    }
  }

  const lineHeight = fontSize;
  const textWidth = Math.ceil(maxLineWidth);
  const textHeight = Math.ceil(lines.length * lineHeight);

  const canvasWidth = textWidth + 2 * borderMargin;
  const canvasHeight = textHeight + 2 * borderMargin;
  const offCanvas = document.createElement('canvas');
  offCanvas.width = canvasWidth;
  offCanvas.height = canvasHeight;
  const offCtx = offCanvas.getContext('2d');

  const bgColor = document.body.classList.contains('light-mode') ? "#fff" : "#000";
  offCtx.fillStyle = bgColor;
  offCtx.fillRect(0, 0, canvasWidth, canvasHeight);

  offCtx.font = `${fontSize}px Consolas, Monaco, "Liberation Mono", monospace`;
  offCtx.textBaseline = 'top';
  offCtx.fillStyle = document.body.classList.contains('light-mode') ? "#000" : "#eee";

  for (let i = 0; i < lines.length; i++) {
    offCtx.fillText(lines[i], borderMargin, borderMargin + i * lineHeight);
  }

  offCanvas.toBlob(function(blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ascii_art.png';
    a.click();
  });
}

// Обработчики событий
document.getElementById('upload').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(event) {
    const img = new Image();
    img.onload = function() {
      currentImage = img;
      generateASCII(img);
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

// Привязка событий к элементам управления
document.getElementById('asciiWidth').addEventListener('input', updateSettings);
document.getElementById('brightness').addEventListener('input', updateSettings);
document.getElementById('contrast').addEventListener('input', updateSettings);
document.getElementById('blur').addEventListener('input', updateSettings);
document.getElementById('dithering').addEventListener('change', updateSettings);
document.getElementById('ditherAlgorithm').addEventListener('change', updateSettings);
document.getElementById('invert').addEventListener('change', updateSettings);
document.getElementById('ignoreWhite').addEventListener('change', updateSettings);
document.getElementById('theme').addEventListener('change', updateSettings);
document.getElementById('charset').addEventListener('change', function () {
  const manualControl = document.getElementById('manualCharControl');
  manualControl.style.display = this.value === 'manual' ? 'flex' : 'none';
  updateSettings();
});
document.getElementById('zoom').addEventListener('input', updateSettings);

// Добавляем обработчик для ручного символа
document.getElementById('manualCharInput').addEventListener('input', function() {
  updateSettings(); // Обновляем настройки при изменении ручного символа
});

// Обработка выбора метода обнаружения границ
document.querySelectorAll('input[name="edgeMethod"]').forEach(function (radio) {
  radio.addEventListener('change', function () {
    const method = document.querySelector('input[name="edgeMethod"]:checked').value;
    document.getElementById('sobelThresholdControl').style.display = method === 'sobel' ? 'flex' : 'none';
    document.getElementById('dogThresholdControl').style.display = method === 'dog' ? 'flex' : 'none';
    updateSettings();
  });
});

// Обработка пороговых значений для методов обнаружения границ
document.getElementById('edgeThreshold').addEventListener('input', updateSettings);
document.getElementById('dogEdgeThreshold').addEventListener('input', updateSettings);

// Кнопки "Сброс" и "Копировать"
document.getElementById('reset').addEventListener('click', resetSettings);
document.getElementById('copyBtn').addEventListener('click', function () {
  const asciiText = document.getElementById('ascii-art').textContent;
  navigator.clipboard.writeText(asciiText).then(() => {
    alert('ASCII искусство скопировано!');
  }, () => {
    alert('Ошибка копирования!');
  });
});
document.getElementById('downloadBtn').addEventListener('click', downloadPNG);

// Настройка максимального количества искр на одно событие
const MAX_SPARKS_PER_EVENT = 3; // Максимум искр на одно событие (уменьшено)
const MIN_SPARKS_PER_EVENT = 1; // Минимум искр на одно событие
const SPARK_LIGHT_COLOR_BASE = 'rgba(114, 137, 218, 1)'; // Цвет для светлой темы
const SPARK_DARK_COLOR_BASE = 'rgba(255, 215, 0, 1)'; // Цвет для темной темы
const SPARK_MAX_DISTANCE = 30; // Максимальное расстояние, на которое будут лететь молнии

// Функция для определения текущей темы
function isLightMode() {
    return document.body.classList.contains('light-mode');
}

// Функция для создания искорок
function createSparkles() {
    const sparksContainer = document.createElement('div');
    sparksContainer.classList.add('sparks');

    // Количество искр зависит от взаимодействия
    const maxSparks = Math.min(MAX_SPARKS_PER_EVENT, Math.floor(Math.random() * MAX_SPARKS_PER_EVENT) + MIN_SPARKS_PER_EVENT); // Уменьшено

    for (let i = 0; i < maxSparks; i++) {
        const spark = document.createElement('div');
        spark.classList.add('spark');

        // Определяем цвет искр в зависимости от темы
        const alpha = Math.random() * 0.7 + 0.3; // Прозрачность
        const bgColor = isLightMode() ? SPARK_LIGHT_COLOR_BASE : SPARK_DARK_COLOR_BASE;
        spark.style.backgroundColor = `${bgColor.slice(0, -2)}, ${alpha})`;

        spark.style.position = 'absolute';
        spark.style.width = '5px'; // Размер искр
        spark.style.height = '5px'; // Размер искр
        spark.style.borderRadius = '50%'; // Делаем искры круглыми
        spark.style.left = `${Math.random() * 100}%`;
        spark.style.top = `${Math.random() * 20 - 10}px`; // Случайная позиция
        spark.style.animationDuration = `${0.5 + Math.random() * 0.5}s`;
        sparksContainer.appendChild(spark);

        setTimeout(() => spark.remove(), 1000); // Удаляем искру после анимации
    }

    document.body.appendChild(sparksContainer); // Добавляем контейнер на страницу
    setTimeout(() => sparksContainer.remove(), 1000); // Удаляем контейнер искр через секунду
}

// Добавляем обработчики для всех необходимых действий, чтобы вызывать родительскую функцию
document.addEventListener('mousemove', createSparkles);
document.addEventListener('click', createSparkles);
document.addEventListener('keydown', createSparkles);

// Эффект искр для слайдеров (молнии)
document.querySelectorAll('input[type="range"]').forEach((slider) => {
    let lastTriggerTime = 0; // Время последнего события
    const TRIGGER_DELAY = 100; // Минимальная задержка между событиями (в миллисекундах)

    slider.addEventListener('input', function () {
        const currentTime = Date.now();

        // Ограничиваем частоту создания молний
        if (currentTime - lastTriggerTime < TRIGGER_DELAY) return;
        lastTriggerTime = currentTime;

        const value = parseFloat(this.value);
        const max = parseFloat(this.max);

        // Определяем количество молний на основе положения джойстика
        const sparksToCreate = Math.floor(MIN_SPARKS_PER_EVENT + (value / max) * (MAX_SPARKS_PER_EVENT - MIN_SPARKS_PER_EVENT));

        // Получаем позицию слайдера и его родительского контейнера
        const sliderRect = this.getBoundingClientRect(); // Размеры слайдера
        const parentRect = this.parentNode.getBoundingClientRect(); // Размеры родительского контейнера

        // Получаем размеры джойстика
        const thumbStyle = window.getComputedStyle(this, '::webkit-slider-thumb'); // Стили джойстика
        const thumbWidth = parseFloat(thumbStyle.width || '16px'); // Ширина джойстика
        const thumbHeight = parseFloat(thumbStyle.height || '16px'); // Высота джойстика

        // Точная позиция центра джойстика относительно родительского контейнера
        const positionX = (sliderRect.left + (sliderRect.width * (value / max)) - thumbWidth / 2) - parentRect.left;
        const positionY = (sliderRect.top + sliderRect.height / 2 - thumbHeight / 2) - parentRect.top - 15;
        // Создаем молнии, которые вылетают из джойстика
        for (let i = 0; i < sparksToCreate; i++) {
            const sparkle = document.createElement('div');
            sparkle.classList.add('lightning');

            // Определяем цвет молний в зависимости от темы
            const alpha = value / max * 0.7; // Прозрачность будет зависеть от положения
            const bgColor = isLightMode() ? SPARK_LIGHT_COLOR_BASE : SPARK_DARK_COLOR_BASE;
            sparkle.style.backgroundColor = `${bgColor.slice(0, -2)}, ${alpha})`;

            sparkle.style.position = 'absolute';
            sparkle.style.width = '2px'; // Ширина молнии
            sparkle.style.height = '20px'; // Высота молнии
            sparkle.style.borderBottom = '8px solid'; // Цвет для молний
            sparkle.style.transformOrigin = 'bottom';
            sparkle.style.left = `${positionX}px`; // Начальная позиция по X
            sparkle.style.top = `${positionY}px`; // Начальная позиция по Y

            // Генерируем случайные направления
            const angle = Math.random() * 2 * Math.PI; // Случайный угол
            const distance = Math.random() * SPARK_MAX_DISTANCE; // Случайное расстояние

            // Запускаем анимацию молний
            setTimeout(() => {
                sparkle.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
                sparkle.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) rotate(${angle}rad)`; // Движение и поворот
                sparkle.style.opacity = '0'; // Затухание после движения
            }, 1);

            this.parentNode.appendChild(sparkle); // Добавляем молнию в родительский элемент

            // Удаляем молнию после завершения анимации
            setTimeout(() => sparkle.remove(), 500);
        }
    });
});

// CSS для искр и молний
const style = document.createElement('style');
style.textContent = `
.spark {
    position: absolute;
    border-radius: 50%;
    transition: transform 0.5s ease, opacity 0.5s ease;
}
.lightning {
    position: absolute;
    width: 2px; /* Ширина молнии */
    height: 20px; /* Высота молнии */
    border-bottom: 8px solid; /* Цвет для молний */
    opacity: 1;
    transition: transform 0.5s ease, opacity 0.5s ease;
}
`;
document.head.appendChild(style);


// Обновление и сброс настроек
function updateSettings() {
  document.getElementById('asciiWidthVal').textContent = document.getElementById('asciiWidth').value;
  document.getElementById('brightnessVal').textContent = document.getElementById('brightness').value;
  document.getElementById('contrastVal').textContent = document.getElementById('contrast').value;
  document.getElementById('blurVal').textContent = document.getElementById('blur').value;
  document.getElementById('zoomVal').textContent = document.getElementById('zoom').value;
  document.getElementById('edgeThresholdVal').textContent = document.getElementById('edgeThreshold').value;
  document.getElementById('dogEdgeThresholdVal').textContent = document.getElementById('dogEdgeThreshold').value;

  const тема = document.getElementById('theme').value;
  document.body.classList.toggle('light-mode', тема === 'light');

  const zoomPercent = parseInt(document.getElementById('zoom').value, 10);
  const newFontSize = (baseFontSize * zoomPercent) / 100;
  const asciiArt = document.getElementById('ascii-art');
  asciiArt.style.fontSize = newFontSize + "px";
  asciiArt.style.lineHeight = newFontSize + "px";

  if (currentImage) {
    generateASCII(currentImage);
  }
}

function resetSettings() {
  document.getElementById('asciiWidth').value = 100;
  document.getElementById('brightness').value = 0;
  document.getElementById('contrast').value = 0;
  document.getElementById('blur').value = 0;
  document.getElementById('dithering').checked = true;
  document.getElementById('ditherAlgorithm').value = 'floyd';
  document.getElementById('invert').checked = false;
  document.getElementById('ignoreWhite').checked = true;
  document.getElementById('charset').value = 'detailed';
  document.getElementById('zoom').value = 100;
  document.getElementById('edgeNone').checked = true;
  document.getElementById('edgeThreshold').value = 100;
  document.getElementById('dogEdgeThreshold').value = 100;
  document.getElementById('sobelThresholdControl').style.display = 'none';
  document.getElementById('dogThresholdControl').style.display = 'none';

  document.getElementById('brightness').disabled = false;
  document.getElementById('contrast').disabled = false;
  document.getElementById('blur').disabled = false;
  document.getElementById('invert').disabled = false;
  updateSettings();
}

window.addEventListener('load', function() {
  const defaultImg = new Image();
  defaultImg.crossOrigin = "Anonymous";
  defaultImg.src = "https://raw.githubusercontent.com/AlexanderOsharov/HM/main/img/icon.png";
  defaultImg.onload = function() {
    currentImage = defaultImg;
    generateASCII(defaultImg);
  };
});