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

  map.addControl(new L.Control.Search({
    url: 'https://nominatim.openstreetmap.org/search?format=json&q={s}',
    jsonpParam: 'json_callback',
    propertyName: 'display_name',
    propertyLoc: ['lat', 'lon'],
    autoCollapse: true,
    autoType: false,
    minLength: 1,
  }));

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
          let mediaHtml = '';
          if (spot.media_filename) {
            const url = spot.media_filename;
            mediaHtml = '<img src="' + url + '" class="spot-popup-img" style="width:100%;margin-top:6px;display:block;cursor:pointer;" title="Click to expand">';
          }
          let deleteHtml = '';
          if (window.CURRENT_USER_ID && window.CURRENT_USER_ID === spot.created_by) {
            deleteHtml = '<button class="btn btn-danger btn-sm mt-2 w-100 delete-spot-btn" data-id="' + spot.id + '">Delete</button>';
          }
          const marker = L.marker([spot.latitude, spot.longitude], { icon: createIcon(spot.sport_type) })
            .bindPopup(
              `
  <div class="card p-3" style="width:300px;">
    <h5 class="text-center">Forums</h5>
    <p><strong>${spot.name}</strong></p>
    <p>${spot.description || ''}</p>
    ${mediaHtml}
    <a href="/spots/${spot.id}" class="btn btn-sm btn-primary w-100 text-white">
      Open Forum
    </a>
    ${deleteHtml}
  </div>
`
            )
            .addTo(map);
          markers.push(marker);
        });
      });
  }

  // Lightbox for popup images
  const lightbox = document.createElement('div');
  lightbox.id = 'lightbox';
  lightbox.innerHTML = '<img id="lightbox-img">';
  document.body.appendChild(lightbox);
  lightbox.addEventListener('click', function () {
    lightbox.style.display = 'none';
  });

  document.getElementById('map').addEventListener('click', function (e) {
    if (e.target.classList.contains('delete-spot-btn')) {
      const id = e.target.getAttribute('data-id');
      if (!confirm('Delete this spot?')) return;
      fetch('/api/spots/' + id, { method: 'DELETE' })
        .then(res => res.json())
        .then(result => {
          if (result.error) { alert(result.error); return; }
          loadSpots(document.getElementById('sport-filter').value);
        });
    }
    if (e.target.classList.contains('spot-popup-img')) {
      document.getElementById('lightbox-img').src = e.target.src;
      lightbox.style.display = 'flex';
    }
  });

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

      fetch('/api/spots', {
        method: 'POST',
        body: new FormData(spotForm),
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
document.addEventListener('click', function (e) {
  if (e.target.classList.contains('delete-comment-btn')) {
    const id = e.target.getAttribute('data-id');

    if (!confirm('Delete this comment?')) return;

    fetch('/delete/' + id, {
      method: 'DELETE'
    })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        alert(data.error);
      } else {
        location.reload(); 
      }
    });
  }
});