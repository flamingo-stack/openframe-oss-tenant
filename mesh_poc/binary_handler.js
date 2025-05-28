function handleBinaryData(data) {
  var view = new Uint8Array(data.length);
  var cmd = (view[0] << 8) + view[1];
  var cmdsize = (view[2] << 8) + view[3];

  console.log("Command: ", cmd);

  if (cmdsize != view.byteLength) {
      console.log('Bad command size', cmd, cmdsize, view.byteLength);
      return
  }

  switch (cmd) {
    case 3:
      var X = (view[4] << 8) + view[5];
      var Y = (view[6] << 8) + view[7];

      // JPEG image data (начинается с view[8])
      const tileData = view.slice(8);
      console.log("Tile header bytes:", view.slice(0, 16));

      // Получаем canvas
      const canvas = document.getElementById('canvas');
      if (!canvas) {
        console.error('Canvas element not found!');
        return;
      }

      // Увеличиваем canvas, если нужно (например, если пришел тайл за пределами текущего размера)
      const minWidth = X + 128;
      const minHeight = Y + 128;
      if (canvas.width < minWidth || canvas.height < minHeight) {
        // Сохраняем старое изображение
        const ctxOld = canvas.getContext('2d');
        const oldImg = ctxOld.getImageData(0, 0, canvas.width, canvas.height);

        // Меняем размер canvas (это очищает его содержимое!)
        canvas.width = Math.max(canvas.width, minWidth);
        canvas.height = Math.max(canvas.height, minHeight);

        // Восстанавливаем старое изображение
        const ctxNew = canvas.getContext('2d');
        ctxNew.putImageData(oldImg, 0, 0);
      }

      const ctx = canvas.getContext('2d');

      // Преобразуем tileData в base64
      let binary = '';
      for (let i = 0; i < tileData.length; i++) {
        binary += String.fromCharCode(tileData[i]);
      }
      const base64 = btoa(binary);

      // Отрисовываем изображение по координатам X, Y
      const img = new Image();
      img.onload = function() {
        console.log('Tile loaded, drawing at', X, Y);
        ctx.drawImage(img, X, Y);
      };
      img.onerror = function() {
        console.log('Tile loading error');
      };
      img.src = 'data:image/jpeg;base64,' + base64;
      break;

    default:
      console.log("Unknown command: ", cmd);
      break;
  }
}