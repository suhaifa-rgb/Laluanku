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
})();

