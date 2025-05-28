/**
 * MeshCentral Desktop Renderer
 * Обработка входящих сообщений от MeshRelay и отрисовка на canvas
 */

class MeshDesktopRenderer {
  constructor(canvasId, options = {}) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) {
          throw new Error(`Canvas с id "${canvasId}" не найден`);
      }
      
      this.ctx = this.canvas.getContext('2d');
      this.options = {
          debugMode: options.debugMode || false,
          imageType: options.imageType || 1, // 1=JPEG, 4=WebP
          compressionLevel: options.compressionLevel || 50,
          scalingLevel: options.scalingLevel || 1024,
          frameRate: options.frameRate || 100,
          ...options
      };
      
      // Состояние рендерера
      this.state = 0; // 0=disconnected, 1=connecting, 2=connected, 3=ready
      this.screenWidth = 0;
      this.screenHeight = 0;
      this.rotation = 0;
      this.firstDraw = true;
      
      // Очередь операций отрисовки
      this.pendingOperations = [];
      this.tilesReceived = 0;
      this.tilesDrawn = 0;
      this.killDraw = 0;
      
      // Callbacks
      this.onStateChange = null;
      this.onScreenSizeChange = null;
      this.onError = null;
      
      this.setupCanvas();
      this.log('MeshDesktopRenderer инициализирован');
  }
  
  setupCanvas() {
      // Настройка canvas
      this.canvas.style.backgroundColor = '#000';
      this.canvas.style.cursor = 'default';
      
      // Отключаем контекстное меню
      this.canvas.oncontextmenu = () => false;
      
      this.log('Canvas настроен');
  }
  
  log(message) {
      if (this.options.debugMode) {
          console.log(`[MeshDesktopRenderer] ${message}`);
      }
  }
  
  /**
   * Обработка входящих бинарных сообщений от MeshRelay
   */
  processBinaryMessage(data) {
      if (!data || data.byteLength < 4) {
          this.log('Получено некорректное сообщение');
          return;
      }
      
      const view = new Uint8Array(data);
      const cmd = view[0];
      const cmdsize = (view[1] << 8) | view[2];
      
      let X = 0, Y = 0;
      if ((cmd === 3) || (cmd === 4) || (cmd === 7)) {
          X = (view[4] << 8) | view[5];
          Y = (view[6] << 8) | view[7];
      }
      
      this.log(`Команда: ${cmd}, размер: ${cmdsize}, X: ${X}, Y: ${Y}`);
      
      switch (cmd) {
          case 3: // Tile - тайл изображения
              if (this.firstDraw) this.onResize();
              this.processPictureMessage(view.slice(4), X, Y);
              break;
              
          case 4: // Copy Rectangle
              if (this.firstDraw) this.onResize();
              if (this.tilesDrawn === this.tilesReceived) {
                  this.processCopyRectMessage(view.slice(4));
              } else {
                  this.pendingOperations.push([++this.tilesReceived, 1, view.slice(4)]);
              }
              break;
              
          case 7: // Screen size
              this.processScreenMessage(X, Y);
              break;
              
          case 11: // Display info
              this.processDisplayInfo(view);
              break;
              
          case 65: // Alert message
              this.processAlertMessage(view.slice(4));
              break;
              
          default:
              this.log(`Неизвестная команда: ${cmd}`);
              break;
      }
  }
  
  /**
   * Обработка тайла изображения
   */
  processPictureMessage(data, x, y) {
      const tile = new Image();
      tile.xcount = this.tilesReceived++;
      const tileCount = this.tilesReceived;
      
      // Конвертируем бинарные данные в base64
      const imageData = data.slice(4); // Пропускаем заголовок
      const base64String = this.arrayBufferToBase64(imageData);
      
      tile.src = `data:image/jpeg;base64,${base64String}`;
      
      tile.onload = () => {
          this.log(`Тайл загружен #${tile.xcount} в позиции ${x},${y}`);
          
          if (this.ctx && this.killDraw < tileCount && this.state !== 0) {
              this.pendingOperations.push([tileCount, 2, tile, x, y]);
              this.processPendingOperations();
          } else {
              this.pendingOperations.push([tileCount, 0]);
          }
      };
      
      tile.onerror = () => {
          this.log('Ошибка загрузки тайла');
          if (this.onError) this.onError('Ошибка загрузки изображения');
      };
  }
  
  /**
   * Обработка очереди операций отрисовки
   */
  processPendingOperations() {
      if (this.pendingOperations.length === 0) return false;
      
      for (let i = 0; i < this.pendingOperations.length; i++) {
          const operation = this.pendingOperations[i];
          
          if (operation[0] === (this.tilesDrawn + 1)) {
              if (operation[1] === 1) {
                  // Copy rectangle
                  this.processCopyRectMessage(operation[2]);
              } else if (operation[1] === 2) {
                  // Draw image
                  const [, , tile, x, y] = operation;
                  this.drawTile(tile, x, y);
                  delete operation[2]; // Освобождаем память
              }
              
              this.pendingOperations.splice(i, 1);
              this.tilesDrawn++;
              
              if (this.tilesDrawn === this.tilesReceived && this.killDraw < this.tilesDrawn) {
                  this.killDraw = this.tilesDrawn = this.tilesReceived = 0;
              }
              
              return true;
          }
      }
      
      return false;
  }
  
  /**
   * Отрисовка тайла на canvas
   */
  drawTile(tile, x, y) {
      if (!this.ctx) return;
      
      try {
          // Применяем поворот если нужно
          const rotatedCoords = this.applyRotation(x, y);
          this.ctx.drawImage(tile, rotatedCoords.x, rotatedCoords.y);
          this.log(`Тайл отрисован в позиции ${rotatedCoords.x},${rotatedCoords.y}`);
      } catch (error) {
          this.log(`Ошибка отрисовки тайла: ${error.message}`);
      }
  }
  
  /**
   * Обработка копирования прямоугольника
   */
  processCopyRectMessage(data) {
      if (data.length < 12) return;
      
      const view = new Uint8Array(data);
      const sx = (view[0] << 8) | view[1];
      const sy = (view[2] << 8) | view[3];
      const dx = (view[4] << 8) | view[5];
      const dy = (view[6] << 8) | view[7];
      const width = (view[8] << 8) | view[9];
      const height = (view[10] << 8) | view[11];
      
      this.log(`Copy rect: ${sx},${sy} -> ${dx},${dy} размер ${width}x${height}`);
      
      try {
          this.ctx.drawImage(this.canvas, sx, sy, width, height, dx, dy, width, height);
      } catch (error) {
          this.log(`Ошибка копирования прямоугольника: ${error.message}`);
      }
  }
  
  /**
   * Обработка изменения размера экрана
   */
  processScreenMessage(width, height) {
      this.log(`Новый размер экрана: ${width}x${height}`);
      
      if (this.screenWidth === width && this.screenHeight === height) {
          return; // Размер не изменился
      }
      
      // Сброс трансформаций
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.rotation = 0;
      this.firstDraw = true;
      
      this.screenWidth = width;
      this.screenHeight = height;
      
      // Очищаем очередь операций
      this.killDraw = this.tilesReceived;
      this.pendingOperations = [];
      
      // Изменяем размер canvas
      this.resizeCanvas(width, height);
      
      if (this.onScreenSizeChange) {
          this.onScreenSizeChange(width, height);
      }
  }
  
  /**
   * Изменение размера canvas
   */
  resizeCanvas(width, height) {
      this.canvas.width = width;
      this.canvas.height = height;
      
      // Заливаем черным цветом
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, width, height);
      
      this.log(`Canvas изменен на ${width}x${height}`);
  }
  
  /**
   * Обработка информации о дисплеях
   */
  processDisplayInfo(data) {
      if (data.length < 6) return;
      
      const view = new Uint8Array(data);
      const displayCount = (view[4] << 8) | view[5];
      
      this.log(`Количество дисплеев: ${displayCount}`);
      
      // Можно добавить обработку информации о дисплеях
  }
  
  /**
   * Обработка alert сообщений
   */
  processAlertMessage(data) {
      const message = new TextDecoder().decode(data);
      this.log(`Alert: ${message}`);
      
      if (message.startsWith('.')) {
          console.log(`KVM: ${message.substring(1)}`);
      } else {
          console.log(message);
      }
  }
  
  /**
   * Применение поворота координат
   */
  applyRotation(x, y) {
      switch (this.rotation) {
          case 0:
              return { x, y };
          case 1:
              return { x: y, y: this.canvas.width - x };
          case 2:
              return { x: this.canvas.width - x, y: this.canvas.height - y };
          case 3:
              return { x: this.canvas.height - y, y: x };
          default:
              return { x, y };
      }
  }
  
  /**
   * Установка поворота экрана
   */
  setRotation(rotation) {
      const newRotation = rotation % 4;
      if (newRotation === this.rotation) return;
      
      this.log(`Поворот экрана: ${this.rotation} -> ${newRotation}`);
      
      // Сохраняем текущее изображение
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      
      // Применяем поворот
      this.rotation = newRotation;
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.rotate((newRotation * 90) * Math.PI / 180);
      
      // Восстанавливаем изображение с поворотом
      this.ctx.putImageData(imageData, 0, 0);
  }
  
  /**
   * Обработка события изменения размера
   */
  onResize() {
      if (this.screenWidth === 0 || this.screenHeight === 0) return;
      
      if (this.canvas.width !== this.screenWidth || this.canvas.height !== this.screenHeight) {
          this.resizeCanvas(this.screenWidth, this.screenHeight);
      }
      
      this.firstDraw = false;
      this.log('Resize обработан');
  }
  
  /**
   * Конвертация ArrayBuffer в base64
   */
  arrayBufferToBase64(buffer) {
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const chunkSize = 50000; // Обрабатываем по частям для больших данных
      
      for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.slice(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, chunk);
      }
      
      return btoa(binary);
  }
  
  /**
   * Изменение состояния
   */
  setState(newState) {
      if (this.state !== newState) {
          this.log(`Состояние изменено: ${this.state} -> ${newState}`);
          this.state = newState;
          
          if (this.onStateChange) {
              this.onStateChange(newState);
          }
      }
  }
  
  /**
   * Очистка canvas
   */
  clear() {
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.log('Canvas очищен');
  }
  
  /**
   * Получение статистики
   */
  getStats() {
      return {
          state: this.state,
          screenWidth: this.screenWidth,
          screenHeight: this.screenHeight,
          rotation: this.rotation,
          tilesReceived: this.tilesReceived,
          tilesDrawn: this.tilesDrawn,
          pendingOperations: this.pendingOperations.length
      };
  }
}

// Экспорт для использования
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MeshDesktopRenderer;
} else if (typeof window !== 'undefined') {
  window.MeshDesktopRenderer = MeshDesktopRenderer;
} 