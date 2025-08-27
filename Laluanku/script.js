(function() {
	const yearSpan = document.getElementById('year');
	if (yearSpan) yearSpan.textContent = new Date().getFullYear();

	const submitForm = document.getElementById('submit-form');
	if (submitForm) {
		submitForm.addEventListener('submit', function(e) {
			e.preventDefault();
			const result = document.getElementById('submit-result');
			if (result) result.textContent = 'Submitted locally (demo). Implement backend later.';
		});
	}

	const gallery = document.getElementById('gallery');
	if (gallery) {
		for (let i = 0; i < 6; i++) {
			const img = document.createElement('img');
			img.src = `https://picsum.photos/seed/laluanku-${i}/400/300`;
			img.alt = 'Sample image';
			gallery.appendChild(img);
		}
	}

	const stats = document.getElementById('stats');
	if (stats) {
		stats.innerHTML = `
			<div><strong>Total Distance:</strong> 12.8 km</div>
			<div><strong>Duration:</strong> 1h 05m</div>
			<div><strong>Avg Speed:</strong> 11.8 km/h</div>
		`;
	}

	const map = document.getElementById('map');
	if (map) {
		map.textContent = 'Map placeholder — integrate Leaflet/Mapbox later.';
	}

	// Geolocation: auto-fill GPS fields on Submit page
	const gpsField = document.getElementById('gps');
	const latField = document.getElementById('latitude');
	const lonField = document.getElementById('longitude');
	if (gpsField && 'geolocation' in navigator) {
		navigator.geolocation.getCurrentPosition(function(position) {
			const latitude = position.coords.latitude.toFixed(6);
			const longitude = position.coords.longitude.toFixed(6);
			gpsField.value = `${latitude}, ${longitude}`;
			if (latField) latField.value = latitude;
			if (lonField) lonField.value = longitude;
		}, function() {
			gpsField.value = 'Location unavailable';
		});
	}

	// Images limit: enforce maximum 250 files
	const imagesInput = document.getElementById('images');
	if (imagesInput) {
		imagesInput.addEventListener('change', function() {
			const files = imagesInput.files ? imagesInput.files : [];
			const help = document.getElementById('images-help');
			if (files.length > 250) {
				const dt = new DataTransfer();
				for (let i = 0; i < 250; i++) dt.items.add(files[i]);
				imagesInput.files = dt.files;
				if (help) help.textContent = `Selected ${files.length} files, trimmed to 250.`;
			} else {
				if (help) help.textContent = `Selected ${files.length} file${files.length === 1 ? '' : 's'}.`;
			}
		});
	}
})();

