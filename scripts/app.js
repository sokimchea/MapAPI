var map = L.map('map').setView([12.5657, 104.9910], 7);
/* L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map); */
// OpenStreetMap Layer
var openStreetMapLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
});

var esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

// Add default layer
openStreetMapLayer.addTo(map);
        var baseMaps = {
            "OpenStreetMap": openStreetMapLayer,
            "Esri World Imagery": esriSatellite
        };

L.control.layers(baseMaps).addTo(map);


//delete layer icon
        L.Control.ClearLayers = L.Control.extend({
            onAdd: function(map) {
                var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
				container.id = 'clearLayersButton';  // Assigning an ID to the container
                container.style.backgroundColor = 'white';
                container.style.width = '30px';
                container.style.height = '30px';
                container.style.backgroundImage = "url('../images/delete.jfif')";
                container.style.backgroundSize = "20px 20px";
                container.style.backgroundRepeat = "no-repeat";
                container.style.backgroundPosition = "center";
                container.style.cursor = 'pointer';

                container.onclick = function() {
                    map.eachLayer(function(layer) {
                        if (layer instanceof L.TileLayer) return;
                        map.removeLayer(layer);
                    });
                }

                return container;
            }
        });

        L.control.clearLayers = function(opts) {
            return new L.Control.ClearLayers(opts);
        }

        L.control.clearLayers({ position: 'topleft' }).addTo(map);
		
		

/* var roadLayer = L.layerGroup().addTo(map); // Stores the selected road segment */
var geojsonData = null; // Variable to store GeoJSON data
		
		
		// function to trigger clear layer
		function triggerClearLayers() {
			var clearButton = document.getElementById('clearLayersButton');
			if (clearButton) {
				clearButton.click();
			} else {
				console.log("Clear layers button not found.");
			}
		}
		
		
// Include all your other JavaScript functions here
		function openStreetView(lat, lng) {
			var url = `https://www.google.com/maps?layer=c&cbll=${lat},${lng}`;
			window.open(url, '_blank');
		}
		// Create a new control for starting the Street View
		//img.src = '/image/google pin.webp'
		
		L.Control.DraggableIcon = L.Control.extend({
			onAdd: function(map) {
				var img = L.DomUtil.create('img');
				img.src = '/images/google pin.webp'; // Use your desired icon
				img.style.width = '30px';
				img.style.cursor = 'pointer';

				img.onmousedown = function(e) {
					// Prevent the map from handling mouse down
					L.DomEvent.stopPropagation(e);

					// Disable map dragging
					map.dragging.disable();

					// Make the icon follow the mouse
					var icon = img.cloneNode(true);
					icon.style.position = 'absolute';
					icon.style.pointerEvents = 'none'; // Ignore pointer events on the floating icon
					document.body.appendChild(icon);

					function onMouseMove(event) {
						icon.style.left = event.clientX - 25 + 'px';
						icon.style.top = event.clientY - 25 + 'px';
					}

					document.addEventListener('mousemove', onMouseMove);

					document.onmouseup = function(event) {
						document.removeEventListener('mousemove', onMouseMove);
						document.body.removeChild(icon);
						document.onmouseup = null;

						// Re-enable map dragging
						map.dragging.enable();

						// Convert screen coordinates to map coordinates and open street view
						var containerPoint = L.point(event.clientX, event.clientY);
						var layerPoint = map.containerPointToLayerPoint(containerPoint);
						var latlng = map.layerPointToLatLng(layerPoint);
						openStreetView(latlng.lat, latlng.lng);
					};
				};

				return img;
			}
		});

		map.addControl(new L.Control.DraggableIcon({ position: 'topright' }));
			
		//SAVING KMZ
		function generateKML(segment) {
			let kml = `<?xml version="1.0" encoding="UTF-8"?>
			<kml xmlns="http://www.opengis.net/kml/2.2">
				<Document>
					<name>Road Segment</name>
					<Placemark>
						<name>Selected Road Segment</name>
						<Style>
							<LineStyle>
								<color>ff0000ff</color> <!-- Red Line -->
								<width>3</width>
							</LineStyle>
						</Style>
						<LineString>
							<tessellate>1</tessellate>
							<coordinates>`;

			// Convert segment to [lon, lat] and add to KML
			segment.forEach(coord => {
				kml += `${coord[0]},${coord[1]},0 `;
			});

			kml += `</coordinates>
						</LineString>
					</Placemark>
				</Document>
			</kml>`;

			return kml;
		}

		
		function haversineDistance(coord1, coord2) {
			var R = 6371000; // Radius of Earth in meters
			
			// Ensure coordinates are in [lat, lon] order
			coord1 = normalizeCoordinate(coord1);
			coord2 = normalizeCoordinate(coord2);
			
			var lat1 = coord1[0] * Math.PI / 180;
			var lat2 = coord2[0] * Math.PI / 180;
			var deltaLat = (coord2[0] - coord1[0]) * Math.PI / 180;
			var deltaLon = (coord2[1] - coord1[1]) * Math.PI / 180;

			var a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
					Math.cos(lat1) * Math.cos(lat2) *
					Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

			var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
			return R * c; // Distance in meters
		}

		// Function to detect and fix coordinate order
		function normalizeCoordinate(coord) {
			if (coord[0] > 90) {
				// If the first value is > 90, assume it's [lon, lat] and swap
				return [coord[1], coord[0]];
			}
			return coord; // Otherwise, assume it's already [lat, lon]
		}

        // Function to compute an intermediate point along a segment
        function interpolatePoint(coord1, coord2, fraction) {
            return [
                coord1[0] + (coord2[0] - coord1[0]) * fraction,
                coord1[1] + (coord2[1] - coord1[1]) * fraction
            ];
        }

		//load road segment
		function loadRoadSegment(roadNumber, startPK, endPK) {
			let road = geojsonData.features.find(f => f.properties.Road_Num == roadNumber);
			if (!road) {
				alert("Road not found!");
				return;
			}

			let coordinates = road.geometry.coordinates;
			if (Array.isArray(coordinates) && coordinates.length === 1 && Array.isArray(coordinates[0])) {
				coordinates = coordinates[0]; // Fix nested array issue
			}

			processRoadSegment(coordinates, startPK, endPK);
		}

		// compute cumulative PK along the Road
		function computePKs(coordinates) {
			let totalDistance = 0;
			let cumulativePKs = [0]; // First point starts at PK=0

			for (let i = 0; i < coordinates.length - 1; i++) {
				let segmentDistance = haversineDistance(coordinates[i], coordinates[i + 1]);
				totalDistance += segmentDistance;
				cumulativePKs.push(totalDistance);
			}
			return { totalDistance, cumulativePKs };
		}
		
		
		function extractSegment(coordinates, cumulativePKs, startPK, endPK) {
			let segment = [];
			let startFound = false, endFound = false;

			for (let i = 0; i < coordinates.length - 1; i++) {
				let segmentStartPK = cumulativePKs[i];
				let segmentEndPK = cumulativePKs[i + 1];

				// If Start PK is within this segment
				if (!startFound && startPK >= segmentStartPK && startPK <= segmentEndPK) {
					let fractionStart = (startPK - segmentStartPK) / (segmentEndPK - segmentStartPK);
					segment.push(interpolatePoint(coordinates[i], coordinates[i + 1], fractionStart));
					startFound = true;
				}

				// If Start PK was found and End PK is not reached
				if (startFound && !endFound) {
					// Only add full segment points if End PK has not been reached
					if (endPK > segmentEndPK) {
						segment.push(coordinates[i + 1]); // Add next full point
					}
				}

				// If End PK is within this segment
				if (!endFound && endPK >= segmentStartPK && endPK <= segmentEndPK) {
					let fractionEnd = (endPK - segmentStartPK) / (segmentEndPK - segmentStartPK);
					segment.push(interpolatePoint(coordinates[i], coordinates[i + 1], fractionEnd));
					endFound = true;
					break; // Stop loop after End PK
				}
			}

			return segment;
		}
		
		//draw road
		function drawRoadSegment(segment) {
			
			triggerClearLayers();
			
			var roadLayer = L.layerGroup().addTo(map); // Stores the selected road segment
			
			roadLayer.clearLayers(); // Remove old drawings

			if (segment.length > 1) {
				console.log("Segment to draw:", segment); // Debug log

				// Convert coordinates from [lon, lat] to [lat, lon] for Leaflet
				let leafletSegment = segment.map(coord => [coord[1], coord[0]]);
				console.log("Converted segment:", leafletSegment); // Debug log

				// Draw the polyline on the map
				let polyline = L.polyline(leafletSegment, { color: "red", weight: 3 }).addTo(roadLayer);

				// Ensure the map fits to the polyline bounds only if valid
				if (polyline.getBounds().isValid()) {
					map.fitBounds(polyline.getBounds());
				} else {
					console.error("Invalid bounds for polyline:", leafletSegment);
				}
			} else {
				alert("Invalid segment selection!");
			}
		}

		//SAVING KMZ
		function generateKML(segment) {
			let kml = `<?xml version="1.0" encoding="UTF-8"?>
			<kml xmlns="http://www.opengis.net/kml/2.2">
				<Document>
					<name>Road Segment</name>
					<Placemark>
						<name>Selected Road Segment</name>
						<Style>
							<LineStyle>
								<color>ff0000ff</color> <!-- Red Line -->
								<width>3</width>
							</LineStyle>
						</Style>
						<LineString>
							<tessellate>1</tessellate>
							<coordinates>`;

			// Convert segment to [lon, lat] and add to KML
			segment.forEach(coord => {
				kml += `${coord[0]},${coord[1]},0 `;
			});

			kml += `</coordinates>
						</LineString>
					</Placemark>
				</Document>
			</kml>`;

			return kml;
		}
		
		//Convert KML to KMZ and Download
		function saveAsKMZ(segment) {
			let zip = new JSZip();
			let kmlContent = generateKML(segment);

			// Add KML file inside ZIP (KMZ)
			zip.file("road_segment.kml", kmlContent);

			// Generate KMZ and trigger download
			zip.generateAsync({ type: "blob" }).then(function (content) {
				let a = document.createElement("a");
				a.href = URL.createObjectURL(content);
				a.download = "road_segment.kmz";
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
			});
		}		

		
		let currentSegment = []; // Store the last drawn road segment
		
		//Splitting Road at User-Defined PKs
		function processRoadSegment(coordinates, startPK, endPK) {
			let { totalDistance, cumulativePKs } = computePKs(coordinates);

			if (startPK >= totalDistance || endPK > totalDistance || startPK >= endPK) {
				alert(`Invalid PK range - Total Distance is only: ${totalDistance.toFixed(2)} meters!`);
				return;
			}

			let segment = extractSegment(coordinates, cumulativePKs, startPK, endPK);
			currentSegment = segment; // Store segment for saving as KMZ
			drawRoadSegment(segment);
		}		
		

		
        // Function to filter and load the road segment based on user input
        function filterRoads() {
			if (!geojsonData) {
				alert("Road data is still loading. Please wait.");
				return;
			}
            var roadNumber = document.getElementById("roadSearch").value;
            var pkStart = parseInt(document.getElementById("pkStart").value);
            var pkEnd = parseInt(document.getElementById("pkEnd").value);

            if (pkStart >= pkEnd) {
                alert("PK Start must be smaller than PK End!");
                return;
            }

            loadRoadSegment(roadNumber, pkStart, pkEnd);
        }

        // Load GeoJSON file when the page loads
        fetch('road_data_test_1.geojson') // UPDATE THIS PATH BASED ON YOUR FILE LOCATION
            .then(response => response.json())
            .then(data => {
                geojsonData = data; // Store data globally
                console.log("GeoJSON data loaded successfully.");
				loadRoadList(); // Populate the search list after loading data
            })
            .catch(error => console.error("Error loading GeoJSON:", error));
		
		// Function to load road numbers from GeoJSON and populate the search list
		function loadRoadList() {
			fetch('road_data_test_1.geojson')
				.then(response => response.json())
				.then(data => {
					let roadList = document.getElementById("roadList");
					roadList.innerHTML = ""; // Clear existing options
					
					let roadNumbers = new Set(); // Use Set to avoid duplicates

					data.features.forEach(road => {
						let roadNumber = road.properties.Road_Num; // Get Road Number from GeoJSON
						if (roadNumber) {
							roadNumbers.add(roadNumber);
						}
					});

					// Add unique road numbers to the datalist
					roadNumbers.forEach(roadNum => {
						let option = document.createElement("option");
						option.value = roadNum;
						roadList.appendChild(option);
					});
				})
				.catch(error => console.error("Error loading roads:", error));
		}

				
		function loadAndShowRoads() {
			fetch('road_data_test_1.geojson') // Make sure the path to your GeoJSON file is correct
				.then(response => response.json())
				.then(data => {
					L.geoJSON(data, {
						style: function (feature) {
							return {color: "#ff7800", weight: 5}; // Customize the road display style
						},
						onEachFeature: function (feature, layer) {
							// Binding a click event to show an alert with the Road ID
							layer.on('click', function () {
								alert("Road ID: " + feature.properties.Road_Num); // Ensure the 'id' property exists in your GeoJSON
							});
							
							// Binding a tooltip to show the road number on hover
							if (feature.properties && feature.properties.Road_Num) {
								layer.bindTooltip("Road Number: " + feature.properties.Road_Num, {permanent: false, direction: "auto"});
							}
						}
					}).addTo(map);
				})
				.catch(err => console.error('Error loading the GeoJSON data: ', err));
		}
		


document.addEventListener("DOMContentLoaded", loadRoadList);
