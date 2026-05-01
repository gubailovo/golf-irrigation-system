let globalRectangle = null;
let exportMapInstance = null; // Храним ссылку на временную карту

function initCutAreaFunctionality(map) {
  const cutAreaBtn = document.getElementById('cut-area');
  if (!cutAreaBtn) {
    console.error('Кнопка "Вырезать участок" не найдена в DOM');
    return;
  }

  let isDrawing = false;
  let firstCorner = null;

  cutAreaBtn.addEventListener('click', function() {
    if (isDrawing) {
      isDrawing = false;
      firstCorner = null;
      cutAreaBtn.textContent = 'Вырезать участок';
      if (globalRectangle) {
        map.removeLayer(globalRectangle);
        globalRectangle = null;
      }
      return;
    }

    isDrawing = true;
    cutAreaBtn.textContent = 'Завершить выделение';
    alert('Кликните на карте для установки первого угла прямоугольника');
  });

  map.on('click', function(e) {
    if (!isDrawing) return;

    if (!firstCorner) {
      firstCorner = e.latlng;
      return;
    }

    const secondCorner = e.latlng;
    if (globalRectangle) map.removeLayer(globalRectangle);

    globalRectangle = L.rectangle([
      [firstCorner.lat, firstCorner.lng],
      [secondCorner.lat, secondCorner.lng]
    ], {
      color: '#FF0000',
      weight: 2,
      fillOpacity: 0.1
    }).addTo(map);

    isDrawing = false;
    firstCorner = null;
    cutAreaBtn.textContent = 'Вырезать участок';
  });
}

async function saveMapAsPNG(map) {
  if (!globalRectangle) {
    alert('Сначала выделите участок на карте!');
    return;
  }

  const bounds = globalRectangle.getBounds();
  const tempContainer = document.getElementById('temp-export-container');

  if (!tempContainer) {
    console.error('Контейнер для экспорта не найден');
    alert('Ошибка: контейнер для экспорта не найден');
    return;
  }

  // Очищаем контейнер и удаляем предыдущую карту, если она есть
  if (exportMapInstance) {
    exportMapInstance.remove();
    exportMapInstance = null;
  }
  tempContainer.innerHTML = '';
  tempContainer.style.display = 'block';

  try {
    // Создаём временную карту
    exportMapInstance = L.map(tempContainer, {
      center: bounds.getCenter(),
      zoom: map.getZoom(),
      crs: L.CRS.EPSG3857,
      attributionControl: false,
      zoomControl: false,
      scrollWheelZoom: false,
      dragging: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(exportMapInstance);
    exportMapInstance.fitBounds(bounds, { padding: [10, 10] });

    // Ждём полной загрузки тайлов
    exportMapInstance.once('tileloadcomplete', async function() {
      setTimeout(async function() {
        try {
          // Используем html2canvas для создания изображения
          const canvas = await html2canvas(tempContainer, {
            scale: 1,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: 800,
            windowHeight: 600,
            allowTaint: true,
            preferCanvas: true
          });

          // Создаём ссылку для скачивания
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `golf-map-${Date.now()}.png`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              console.log('Файл успешно сохранён');
            } else {
              alert('Не удалось сохранить изображение');
            }
            // Очищаем временную карту
            if (exportMapInstance) {
              exportMapInstance.remove();
              exportMapInstance = null;
            }
            tempContainer.style.display = 'none';
          }, 'image/png');
        } catch (canvasError) {
          console.error('Ошибка при создании canvas:', canvasError);
          alert('Ошибка при создании изображения: ' + canvasError.message);
          if (exportMapInstance) {
            exportMapInstance.remove();
            exportMapInstance = null;
          }
          tempContainer.style.display = 'none';
        }
      }, 1500); // Задержка для полной загрузки
    });
  } catch (error) {
    console.error('Ошибка при инициализации временной карты:', error);
    alert('Ошибка при сохранении: ' + error.message);
    tempContainer.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // Проверяем наличие всех элементов перед инициализацией
  const mapContainer = document.getElementById('map');
  const saveBtn = document.getElementById('save-png');

  if (!mapContainer) {
    console.error('Контейнера карты #map не найдено');
    return;
  }

  if (!saveBtn) {
    console.error('Кнопки сохранения #save-png не найдено');
    return;
  }

  const map = L.map('map').setView([55.751244, 37.618423], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  initCutAreaFunctionality(map);
  saveBtn.addEventListener('click', () => saveMapAsPNG(map));
});
