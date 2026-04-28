(function initServiceMap() {
  var mapEls = Array.prototype.slice.call(document.querySelectorAll(".service-map"));
  if (!mapEls.length || !window.L) return;

  var primary = [
    ["Healdsburg", 38.6102, -122.8694],
    ["Windsor", 38.5471, -122.8164],
    ["Santa Rosa", 38.4405, -122.7144],
    ["Sebastopol", 38.4021, -122.8239],
    ["Kenwood", 38.4139, -122.5531],
    ["Glen Ellen", 38.3627, -122.5264],
    ["Rohnert Park", 38.3396, -122.7011],
    ["Sonoma", 38.2919, -122.458],
    ["Petaluma", 38.2324, -122.6367],
    ["Novato", 38.1074, -122.5697],
    ["San Rafael", 37.9735, -122.5311],
    ["Mill Valley", 37.906, -122.545],
    ["Tiburon", 37.8735, -122.4569],
    ["Sausalito", 37.859, -122.4852],
  ];

  var byRequest = [
    ["Napa", 38.2975, -122.2869],
    ["San Francisco", 37.7749, -122.4194],
  ];

  var primaryStyle = {
    radius: 8,
    fillColor: "#1B6E86",
    color: "#ffffff",
    weight: 3,
    fillOpacity: 1,
  };

  var requestStyle = {
    radius: 8,
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

    primary.forEach(function (c) {
      L.circleMarker([c[1], c[2]], primaryStyle)
        .addTo(map)
        .bindTooltip(c[0], { direction: "top", offset: [0, -4] });
    });

    byRequest.forEach(function (c) {
      L.circleMarker([c[1], c[2]], requestStyle)
        .addTo(map)
        .bindTooltip(c[0] + " (by request)", {
          direction: "top",
          offset: [0, -4],
        });
    });
  });
})();
