// Only run map logic on the home page
if (document.getElementById('map')) {

  const sportColors = {
    climbing: '#e74c3c',
    skating:  '#3498db',
    skiing:   '#2ecc71',
    parkour:  '#f39c12',
    other:    '#9b59b6',
  };

  const map = L.map('map').setView([39.7392, -104.9903], 11);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  let markers = [];
  let pendingMarker = null;
  let addingSpot = false;

  function createIcon(sportType) {
    const color = sportColors[sportType] || sportColors.other;
    return L.divIcon({
      className: '',
      html: `<div class="spot-pin" style="background-color:${color};"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -12],
    });
  }

  function loadSpots(sportType) {
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    const url = (sportType && sportType !== 'all')
      ? '/api/spots?sport_type=' + sportType
      : '/api/spots';

    fetch(url)
      .then(res => res.json())
      .then(data => {
        data.spots.forEach(spot => {
          const marker = L.marker([spot.latitude, spot.longitude], { icon: createIcon(spot.sport_type) })
            .bindPopup(
              '<strong>' + spot.name + '</strong><br>' +
              '<em>' + spot.sport_type + ' &bull; ' + spot.difficulty + '</em>' +
              (spot.description ? '<br>' + spot.description : '')
            )
            .addTo(map);
          markers.push(marker);
        });
      });
  }

  loadSpots('all');

  document.getElementById('sport-filter').addEventListener('change', function () {
    loadSpots(this.value);
  });

  // Geolocation
  let userMarker = null;

  document.getElementById('locate-btn').addEventListener('click', function () {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function (position) {
        const { latitude, longitude } = position.coords;
        map.setView([latitude, longitude], 13);
        if (userMarker) map.removeLayer(userMarker);
        userMarker = L.circleMarker([latitude, longitude], {
          radius: 8,
          color: '#fff',
          fillColor: '#4285f4',
          fillOpacity: 1,
          weight: 2,
        }).bindPopup('You are here').addTo(map);
      },
      function () {
        alert('Unable to get your location.');
      }
    );
  });

  // Add spot logic (only present when user is logged in)
  const addBtn = document.getElementById('add-spot-btn');
  const spotForm = document.getElementById('spot-form');
  const spotModal = document.getElementById('spotModal')
    ? new bootstrap.Modal(document.getElementById('spotModal'))
    : null;

  if (addBtn && spotModal) {
    addBtn.addEventListener('click', function () {
      addingSpot = true;
      addBtn.textContent = 'Click map to place spot...';
      addBtn.classList.replace('btn-primary', 'btn-warning');
      map.getContainer().style.cursor = 'crosshair';
    });

    map.on('click', function (e) {
      if (!addingSpot) return;

      const { lat, lng } = e.latlng;

      if (pendingMarker) map.removeLayer(pendingMarker);
      pendingMarker = L.marker([lat, lng]).addTo(map);

      document.getElementById('spot-lat').value = lat.toFixed(6);
      document.getElementById('spot-lng').value = lng.toFixed(6);
      document.getElementById('location-display').textContent =
        'Location: ' + lat.toFixed(5) + ', ' + lng.toFixed(5);

      addingSpot = false;
      addBtn.textContent = '+ Add Spot';
      addBtn.classList.replace('btn-warning', 'btn-primary');
      map.getContainer().style.cursor = '';

      spotModal.show();
    });

    document.getElementById('spotModal').addEventListener('hidden.bs.modal', function () {
      if (pendingMarker) {
        map.removeLayer(pendingMarker);
        pendingMarker = null;
      }
      spotForm.reset();
      document.getElementById('location-display').textContent = '';
    });

    spotForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(spotForm));

      fetch('/api/spots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
        .then(res => res.json())
        .then(result => {
          if (result.error) {
            alert(result.error);
            return;
          }
          spotModal.hide();
          loadSpots(document.getElementById('sport-filter').value);
        });
    });
  }
}
