/*
Author       : Dreamguys
Template Name: SmartHR - Bootstrap Admin Template
Version      : 3.6
*/

$(document).ready(function() {



    if ($('.kanban-wrap').length > 0) {
        $(".kanban-wrap").sortable({
            connectWith: ".kanban-wrap",
            handle: ".kanban-box",
            placeholder: "drag-placeholder"
        });
    }

    if ($('.datetimepicker').length > 0) {
        $('.datetimepicker').datetimepicker({
            format: 'DD/MM/YYYY',
            icons: {
                up: "bx bx-chevron-up",
                down: "bx bx-chevron-down",
                next: 'bx bx-chevron-right',
                previous: 'bx bx-chevron-left'
            }
        });
    }

});

// --- New Project: Geolocation, Google Map, and Submit ---
window.initProjectMap = function() {
    var mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    var defaultLatLng = { lat: 0, lng: 0 };
    var map = new google.maps.Map(mapContainer, {
        center: defaultLatLng,
        zoom: 2,
        mapTypeId: 'roadmap'
    });
    var marker = new google.maps.Marker({
        position: defaultLatLng,
        map: map
    });

    function setLatLng(lat, lng) {
        var latInput = document.getElementById('gps-lat');
        var lngInput = document.getElementById('gps-lng');
        if (latInput) latInput.value = lat.toFixed(6);
        if (lngInput) lngInput.value = lng.toFixed(6);
        var pos = { lat: lat, lng: lng };
        map.setCenter(pos);
        map.setZoom(14);
        marker.setPosition(pos);
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            setLatLng(position.coords.latitude, position.coords.longitude);
        }, function() {
            // Keep default on error
        }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    }

    var submitBtn = document.getElementById('submitNewProjectMedia');
    var imageInput = document.getElementById('imageFiles');
    var imageCount = document.getElementById('imageCount');

    if (imageInput && imageCount) {
        imageInput.addEventListener('change', function() {
            var count = imageInput.files ? imageInput.files.length : 0;
            if (count > 250) {
                imageCount.textContent = 'You selected ' + count + ' images. Max allowed is 250.';
                imageCount.style.color = '#dc3545';
            } else {
                imageCount.textContent = count + ' image(s) selected';
                imageCount.style.color = '';
            }
        });
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', function() {
            var lat = document.getElementById('gps-lat') ? document.getElementById('gps-lat').value : '';
            var lng = document.getElementById('gps-lng') ? document.getElementById('gps-lng').value : '';
            var notes = document.getElementById('shortNotes') ? document.getElementById('shortNotes').value : '';
            var files = imageInput && imageInput.files ? imageInput.files : [];

            if (files.length > 250) {
                alert('Please select up to 250 images.');
                return;
            }

            var formData = new FormData();
            formData.append('lat', lat);
            formData.append('lng', lng);
            formData.append('notes', notes);
            for (var i = 0; i < files.length; i++) {
                formData.append('images', files[i]);
            }

            fetch('/api/new-project', {
                method: 'POST',
                body: formData
            }).then(function(res) { return res.json(); })
              .then(function(data) {
                  alert('Submitted successfully');
              })
              .catch(function(err) {
                  alert('Submit failed');
              });
        });
    }
}

// Loader

$(window).on('load', function() {
    $('#loader').delay(100).fadeOut('slow');
    $('#loader-wrapper').delay(500).fadeOut('slow');
});



// var $a = self.$widget.find('a[data-rating-value="' + ratingValue() + '"]');


// resetStyle();


// $a.addClass('br-selected br-current')[nextAllorPreviousAll()]()
//     .addClass('br-selected');

// if (!getData('ratingMade') && $.isNumeric(initialRating)) {
//     if ((initialRating <= baseValue) || !f) {
//         return;
//     }

//     $all = self.$widget.find('a');

//     $fractional = ($a.length) ?
//         $a[(getData('userOptions').reverse) ? 'prev' : 'next']() :
//         $all[(getData('userOptions').reverse) ? 'last' : 'first']();

//     $fractional.addClass('br-fractional');
//     $fractional.addClass('br-fractional-' + f);
// }