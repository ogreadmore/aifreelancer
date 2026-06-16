(function initServiceMap() {
  var mapEls = Array.prototype.slice.call(document.querySelectorAll(".service-map"));
  if (!mapEls.length || !window.L) return;

  var primary = [
    ["Cloverdale", 38.8055, -123.0172],
    ["Healdsburg", 38.6102, -122.8694],
    ["Windsor", 38.5471, -122.8164],
    ["Santa Rosa", 38.4405, -122.7144],
    ["Sebastopol", 38.4021, -122.8239],
    ["Kenwood", 38.4139, -122.5531],
    ["Glen Ellen", 38.3627, -122.5264],
    ["Rohnert Park", 38.3396, -122.7011],
    ["Cotati", 38.3269, -122.7072],
    ["Sonoma", 38.2919, -122.458],
    ["Petaluma", 38.2324, -122.6367],
    ["Novato", 38.1074, -122.5697],
    ["San Rafael", 37.9735, -122.5311],
    ["San Anselmo", 37.9746, -122.5616],
    ["Fairfax", 37.9871, -122.5889],
    ["Ross", 37.9624, -122.5544],
    ["Larkspur", 37.9341, -122.5353],
    ["Corte Madera", 37.9255, -122.5275],
    ["Mill Valley", 37.906, -122.545],
    ["Tiburon", 37.8735, -122.4569],
    ["Belvedere", 37.8727, -122.4644],
    ["Sausalito", 37.859, -122.4852],
  ];

  var byRequest = [
    ["Calistoga", 38.5788, -122.5797],
    ["St. Helena", 38.5052, -122.4704],
    ["Yountville", 38.4016, -122.3608],
    ["Napa", 38.2975, -122.2869],
    ["American Canyon", 38.1749, -122.2608],
    ["Dixon", 38.4455, -121.8233],
    ["Vacaville", 38.3566, -121.9877],
    ["Fairfield", 38.2494, -122.0399],
    ["Suisun City", 38.2383, -122.0402],
    ["Rio Vista", 38.1558, -121.6913],
    ["Vallejo", 38.1041, -122.2566],
    ["Benicia", 38.0494, -122.1586],
    ["San Francisco", 37.7749, -122.4194],
  ];

  var primaryStyle = {
    radius: 7,
    fillColor: "#1B6E86",
    color: "#ffffff",
    weight: 3,
    fillOpacity: 1,
  };

  var requestStyle = {
    radius: 7,
    fillColor: "#ffffff",
    color: "#1B6E86",
    weight: 2.5,
    fillOpacity: 1,
    dashArray: "3 3",
  };

  mapEls.forEach(function (el) {
    var fallback = el.querySelector(".map-fallback");
    if (fallback) {
      fallback.remove();
    }

    var map = L.map(el, {
      scrollWheelZoom: false,
      zoomControl: true,
      attributionControl: true,
    }).setView([38.22, -122.62], 9);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    var coverageBounds = L.latLngBounds([]);

    primary.forEach(function (c) {
      coverageBounds.extend([c[1], c[2]]);

      L.circleMarker([c[1], c[2]], primaryStyle)
        .addTo(map)
        .bindTooltip(c[0], { direction: "top", offset: [0, -4] });
    });

    byRequest.forEach(function (c) {
      coverageBounds.extend([c[1], c[2]]);

      L.circleMarker([c[1], c[2]], requestStyle)
        .addTo(map)
        .bindTooltip(c[0] + " (by request)", {
          direction: "top",
          offset: [0, -4],
        });
    });

    if (coverageBounds.isValid()) {
      map.fitBounds(coverageBounds, {
        padding: [18, 18],
        maxZoom: 9,
      });
    }
  });
})();
