let globalRectangle = null;

function initCutAreaFunctionality(map) {
  const cutAreaBtn = document.getElementById('cut-area');
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
    alert('Кликните на карте для установки первого угла прямоугольника. Двигайте мышь для изменения размера. Кликните ещё раз для фиксации.');
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

    const bounds = globalRectangle.getBounds();
    alert(`Выделенный участок:\nСеверная широта: ${bounds.getNorth().toFixed(6)}\nЮжная широта: ${bounds.getSouth().toFixed(6)}\nВосточная долгота: ${bounds.getEast().toFixed(6)}\nЗападная долгота: ${bounds.getWest().toFixed(6)}`);


    isDrawing = false;
    firstCorner = null;
    cutAreaBtn.textContent = 'Вырезать участок';
  });

  map.on('mousemove', function(e) {
    if (isDrawing && firstCorner) {
      const secondCorner = e.latlng;
      if (globalRectangle) map.removeLayer(globalRectangle);

      globalRectangle = L.rectangle([
        [firstCorner.lat, firstCorner.lng],
        [secondCorner.lat, secondCorner.lng]
      ], {
        color: '#FF0000',
        weight: 2,
        fillOpacity: 0.1,
        draggable: false
      }).addTo(map);
    }
  });
}

function initSavePNGFunctionality(map) {
  document.getElementById('save-png').addEventListener('click', async function() {
    console.log('Кнопка "Сохранить как PNG" нажата');

    if (!globalRectangle) {
      alert('Сначала выделите участок на карте с помощью кнопки «Вырезать участок»');
      return;
    }

    console.log('Выделенный прямоугольник найден');

    try {
      const bounds = globalRectangle.getBounds();
      console.log('Границы выделенного участка:', bounds);

      // Удаляем предыдущую временную карту, если она есть
      const existingExportMap = window.exportMapInstance;
      if (existingExportMap) {
        existingExportMap.remove();
        window.exportMapInstance = null;
      }

      const tempContainer = document.getElementById('temp-export-container');
      tempContainer.style.width = '800px';
      tempContainer.style.height = '600px';
      tempContainer.innerHTML = ''; // Очищаем контейнер

      // Обязательно добавляем контейнер в DOM перед созданием карты
      document.body.appendChild(tempContainer);

      // Создаём временную карту
      const exportMap = L.map(tempContainer, {
        center: bounds.getCenter(),
        zoom: map.getZoom(),
        crs: L.CRS.EPSG3857,
        attributionControl: false,
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: false
      });

      window.exportMapInstance = exportMap;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: ''
      }).addTo(exportMap);

      // Ждём, пока контейнер будет готов к отрисовке
      setTimeout(() => {
        exportMap.fitBounds(bounds, { padding: [10, 10] });
        console.log('Временная карта инициализирована и настроена');

        // Ждём загрузки тайлов
        exportMap.once('tileloadcomplete', async function() {
          console.log('Все тайлы карты загружены');

          // Даём дополнительное время на полную загрузку
          setTimeout(async function() {
            try {
              console.log('Начинаем создание canvas...');

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
              console.log('Canvas создан успешно');

              // Создаём ссылку для скачивания
              canvas.toBlob((blob) => {
                if (blob) {
                  console.log('Blob создан, размер:', blob.size);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `golf-map-selected-${new Date().toISOString().split('T')[0]}.png`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  console.log('Файл предложен к скачиванию');

                  // Удаляем временную карту и контейнер
                  exportMap.remove();
                  tempContainer.remove(); // Удаляем контейнер из DOM
                  window.exportMapInstance = null;
                } else {
                  console.error('Не удалось создать blob из canvas');
                  alert('Не удалось сохранить изображение');
                  exportMap.remove();
                  tempContainer.remove();
                  window.exportMapInstance = null;
                }
              }, 'image/png', 0.9);
            } catch (canvasError) {
              console.error('Ошибка при создании canvas:', canvasError);
              alert('Не удалось создать изображение для экспорта');
              exportMap.remove();
              tempContainer.remove();
              window.exportMapInstance = null;
            }
          }, 2000); // Задержка для полной загрузки
        });
      }, 100); // Небольшая задержка перед fitBounds
    } catch (error) {
      console.error('Критическая ошибка при сохранении:', error);
      alert('Не удалось сохранить выделенный участок как PNG');
    }
  });
}

function initLoadImageFunctionality() {
  document.getElementById('load-image').addEventListener('click', function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
          alert('Изображение загружено! (В полной версии будет привязано к координатам карты)');
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
    input.click();
  });
}

function initEditorNavigation() {
  document.getElementById('go-to-editor').addEventListener('click', function() {
    window.location.href = 'editor.html';
  });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
  // Инициализируем карту с центром в Москве
  const map = L.map('map').setView([55.751244, 37.618423], 13);

  // Подключаем слой OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  // Инициализируем функционал кнопок
  initCutAreaFunctionality(map);
  initSavePNGFunctionality(map);
  initLoadImageFunctionality();
  initEditorNavigation();
});
