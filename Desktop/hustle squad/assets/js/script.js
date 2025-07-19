// Routify - Advanced Route Planning & Matching System
// Enhanced version with live location, routing, and smart matching

class RoutifyApp {
  constructor() {
    // Core elements
    this.form = document.getElementById('routeForm');
    this.mapContainer = document.getElementById('map');
    this.matchList = document.getElementById('matches');
    this.liveUsersContainer = document.getElementById('liveUsers');
    this.loadingOverlay = document.getElementById('loadingOverlay');
    
    // State management
    this.map = null;
    this.userMarker = null;
    this.routingControl = null;
    this.routesDB = [];
    this.liveUsers = [];
    this.currentUserLocation = null;
    this.isLocationSharing = false;
    this.watchId = null;
    
    // Initialize the application
    this.init();
  }

  async init() {
    this.setupMap();
    this.setupEventListeners();
    this.setupGeolocation();
    this.startLocationSimulation();
    
    // Clear all form fields first (in case browser remembers values)
    this.clearFormFields();
    
    // Clear all form fields on initialization (including persistent browser values)
    this.clearFormFields();
    
    // Initialize live users display as disabled
    this.liveUsersContainer.innerHTML = '<p style="color: #a0aec0; text-align: center; padding: 1rem; font-size: 0.9rem;"><i class="fas fa-location-slash"></i><br/>Location sharing disabled<br/>Enable to see live travelers</p>';
  }

  // Clear all form fields
  clearFormFields() {
    document.getElementById('start').value = '';
    document.getElementById('end').value = '';
    document.getElementById('transport').selectedIndex = 0; // Reset to default "Select transport mode"
    document.getElementById('shareLocation').checked = false; // Reset location toggle
    
    // Clear time field properly
    const timeField = document.getElementById('time');
    timeField.value = '';
  }

  // Start a new route (clear form and reset time)
  startNewRoute() {
    // Clear form fields
    this.clearFormFields();
    
    // Clear matches display
    document.getElementById('matches').innerHTML = '';
    document.getElementById('noMatches').style.display = 'block';
    
    // Show notification
    this.showNotification('Form cleared! Ready for a new route.', 'info');
    
    // Focus on start field for better UX
    document.getElementById('start').focus();
  }

  // Initialize Leaflet Map
  setupMap() {
    this.map = L.map('map').setView([28.6139, 77.2090], 10); // Delhi center
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Custom marker icons
    this.createCustomIcons();
  }

  createCustomIcons() {
    this.icons = {
      user: L.divIcon({
        className: 'user-marker',
        html: '<i class="fas fa-user-circle" style="color: #667eea; font-size: 24px;"></i>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      }),
      start: L.divIcon({
        className: 'start-marker',
        html: '<i class="fas fa-play-circle" style="color: #48bb78; font-size: 20px;"></i>',
        iconSize: [25, 25],
        iconAnchor: [12, 12]
      }),
      end: L.divIcon({
        className: 'end-marker',
        html: '<i class="fas fa-flag-checkered" style="color: #f56565; font-size: 20px;"></i>',
        iconSize: [25, 25],
        iconAnchor: [12, 12]
      }),
      match: L.divIcon({
        className: 'match-marker',
        html: '<i class="fas fa-users" style="color: #ed8936; font-size: 18px;"></i>',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      })
    };
  }

  // Setup event listeners
  setupEventListeners() {
    // Form submission
    this.form.addEventListener('submit', (e) => this.handleRouteSubmission(e));
    
    // Use current location button
    document.getElementById('useCurrentStart').addEventListener('click', () => {
      this.useCurrentLocation();
    });
    
    // Location sharing toggle
    document.getElementById('shareLocation').addEventListener('change', (e) => {
      this.toggleLocationSharing(e.target.checked);
    });
    
    // Map controls
    document.getElementById('clearMap').addEventListener('click', () => this.clearMap());
    document.getElementById('centerMap').addEventListener('click', () => this.centerOnUser());
    
    // New route button
    document.getElementById('newRouteBtn').addEventListener('click', () => this.startNewRoute());
    
    // Location modal controls
    document.getElementById('closeLocationModal').addEventListener('click', () => {
      this.hideLocationModal();
    });
    
    document.getElementById('allowLocationBtn').addEventListener('click', () => {
      this.handleLocationAllow();
    });
    
    document.getElementById('denyLocationBtn').addEventListener('click', () => {
      this.handleLocationDeny();
    });
    
    // Close modal on background click
    document.getElementById('locationModal').addEventListener('click', (e) => {
      if (e.target.id === 'locationModal') {
        this.hideLocationModal();
      }
    });
  }

  // Setup geolocation - passive, doesn't request permission automatically
  setupGeolocation() {
    // Don't automatically request location on page load
    // Location will be requested only when user enables location sharing
    if (!navigator.geolocation) {
      this.showNotification('Geolocation is not supported by this browser.', 'warning');
    }
  }

  // Use current location for start point
  async useCurrentLocation() {
    if (!this.currentUserLocation) {
      // Request location if not available
      const success = await this.requestLocationPermission();
      if (!success) {
        this.showNotification('Cannot get current location. Please enable location sharing first.', 'warning');
        return;
      }
    }
    
    if (this.currentUserLocation) {
      this.reverseGeocode(this.currentUserLocation[0], this.currentUserLocation[1])
        .then(address => {
          document.getElementById('start').value = address;
          this.showNotification('Current location set as start point!', 'success');
        });
    }
  }

  // Toggle live location sharing
  toggleLocationSharing(enabled) {
    const statusElement = document.getElementById('locationStatus');
    
    if (enabled) {
      // Show modal instead of directly requesting permission
      this.showLocationModal();
    } else {
      this.disableLocationSharing();
    }
  }

  // Show location permission modal
  showLocationModal() {
    document.getElementById('locationModal').style.display = 'flex';
  }

  // Hide location permission modal
  hideLocationModal() {
    document.getElementById('locationModal').style.display = 'none';
    // Reset toggle if user closes modal without allowing
    const toggle = document.getElementById('shareLocation');
    if (!this.isLocationSharing) {
      toggle.checked = false;
    }
  }

  // Handle location allow button click
  async handleLocationAllow() {
    this.hideLocationModal();
    const statusElement = document.getElementById('locationStatus');
    
    // Show loading state
    statusElement.textContent = 'Requesting...';
    statusElement.className = 'location-status';
    
    // Show a notification that browser permission will be requested
    this.showNotification('📍 Requesting location permission from your browser...', 'info');
    
    try {
      const success = await this.requestLocationPermission();
      if (success) {
        // Set the toggle checkbox to checked state
        document.getElementById('shareLocation').checked = true;
        
        this.startLocationSharing();
        statusElement.textContent = 'Enabled';
        statusElement.className = 'location-status enabled';
        this.isLocationSharing = true;
        
        this.showNotification('🎉 Live location enabled! Only connected travel companions can see your location.', 'success');
        
        // Show user as active with privacy note
        this.updateLiveUsers([
          { name: 'You', transport: 'active', location: this.currentUserLocation || [28.6139, 77.2090] }
        ]);
      } else {
        // Reset toggle if permission denied
        this.resetLocationToggle();
        this.showNotification('❌ Location permission denied by browser. You can enable it in browser settings if you change your mind.', 'warning');
      }
    } catch (error) {
      this.resetLocationToggle();
      this.showNotification('⚠️ Failed to enable location sharing. Please try again or check browser permissions.', 'error');
    }
  }

  // Handle location deny button click
  handleLocationDeny() {
    this.hideLocationModal();
    this.resetLocationToggle();
    this.showNotification('Location sharing disabled. You can enable it anytime!', 'info');
  }

  // Disable location sharing
  disableLocationSharing() {
    const statusElement = document.getElementById('locationStatus');
    
    this.stopLocationSharing();
    statusElement.textContent = 'Disabled';
    statusElement.className = 'location-status disabled';
    this.isLocationSharing = false;
    
    this.showNotification('Live location sharing disabled. You appear offline.', 'info');
    
    // Clear live users display
    this.liveUsersContainer.innerHTML = '<p style="color: #a0aec0; text-align: center; padding: 1rem; font-size: 0.9rem;"><i class="fas fa-location-slash"></i><br/>Location sharing disabled<br/>Enable to see live travelers</p>';
  }

  // Reset location toggle to off state
  resetLocationToggle() {
    const toggle = document.getElementById('shareLocation');
    const statusElement = document.getElementById('locationStatus');
    
    toggle.checked = false;
    statusElement.textContent = 'Disabled';
    statusElement.className = 'location-status disabled';
    this.isLocationSharing = false;
  }

  // Request location permission
  async requestLocationPermission() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        this.showNotification('Geolocation is not supported by this browser.', 'error');
        resolve(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.currentUserLocation = [latitude, longitude];
          
          // Update or add user marker
          if (this.userMarker) {
            this.map.removeLayer(this.userMarker);
          }
          
          this.userMarker = L.marker([latitude, longitude], {
            icon: this.icons.user
          }).addTo(this.map)
            .bindPopup('<strong>📍 You are here</strong><br/>Live location enabled')
            .openPopup();
            
          // Center map on user location
          this.map.setView([latitude, longitude], 13);
          
          resolve(true);
        },
        (error) => {
          console.warn('Geolocation error:', error);
          let errorMessage = 'Location access denied.';
          
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
          }
          
          this.showNotification(errorMessage, 'warning');
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }

  startLocationSharing() {
    if (navigator.geolocation) {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          this.currentUserLocation = [position.coords.latitude, position.coords.longitude];
          this.updateUserMarker();
        },
        (error) => console.warn('Location tracking error:', error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    }
  }

  stopLocationSharing() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  updateUserMarker() {
    if (this.userMarker && this.currentUserLocation) {
      this.userMarker.setLatLng(this.currentUserLocation);
    }
  }

  // Handle route form submission
  async handleRouteSubmission(e) {
    e.preventDefault();
    
    const formData = {
      start: document.getElementById('start').value.trim(),
      end: document.getElementById('end').value.trim(),
      time: document.getElementById('time').value,
      transport: document.getElementById('transport').value
    };

    if (!formData.start || !formData.end) {
      this.showNotification('Please enter both start and end locations!', 'error');
      return;
    }
    
    if (!formData.transport) {
      this.showNotification('Please select a transport mode!', 'error');
      return;
    }
    
    if (!formData.time) {
      this.showNotification('Please select a date and time!', 'error');
      return;
    }

    this.showLoading(true);

    try {
      // Geocode locations
      const startCoord = await this.geocodeLocation(formData.start);
      const endCoord = await this.geocodeLocation(formData.end);

      if (!startCoord || !endCoord) {
        throw new Error('Could not find one or more locations');
      }

      const newRoute = {
        id: this.generateId(),
        ...formData,
        startCoord,
        endCoord,
        timestamp: new Date(),
        distance: this.getDistance(startCoord[0], startCoord[1], endCoord[0], endCoord[1]),
        user: this.generateUserInfo()
      };

      // Add route to database
      this.routesDB.push(newRoute);

      // Display route on map
      await this.displayRoute(newRoute);

      // Find and display matches
      this.findMatches(newRoute);

      // Show success notification
      this.showNotification(`Route added successfully! Found ${this.getMatches(newRoute).length} potential matches.`, 'success');

      // Don't reset form - keep user's input for reference
      // Users can manually clear or modify for next route
      
    } catch (error) {
      console.error('Route submission error:', error);
      this.showNotification('Error processing route. Please try again.', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  // Geocode location using Nominatim API (free)
  async geocodeLocation(address) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=in`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
      
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  // Reverse geocode coordinates to address
  async reverseGeocode(lat, lon) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      );
      const data = await response.json();
      
      if (data && data.display_name) {
        // Simplify address
        const parts = data.display_name.split(',');
        return parts.slice(0, 3).join(', ');
      }
      
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
  }

  // Display route on map with routing
  async displayRoute(route) {
    // Clear previous routing
    if (this.routingControl) {
      this.map.removeControl(this.routingControl);
    }

    // Add markers
    const startMarker = L.marker(route.startCoord, {
      icon: this.icons.start
    }).addTo(this.map)
      .bindPopup(`<strong>🚀 Start:</strong><br/>${route.start}`);

    const endMarker = L.marker(route.endCoord, {
      icon: this.icons.end
    }).addTo(this.map)
      .bindPopup(`<strong>🏁 Destination:</strong><br/>${route.end}`);

    // Add routing line (if routing machine is available)
    if (L.Routing) {
      this.routingControl = L.Routing.control({
        waypoints: [
          L.latLng(route.startCoord[0], route.startCoord[1]),
          L.latLng(route.endCoord[0], route.endCoord[1])
        ],
        routeWhileDragging: false,
        addWaypoints: false,
        createMarker: () => null, // Don't create default markers
        lineOptions: {
          styles: [{
            color: this.getTransportColor(route.transport),
            weight: 5,
            opacity: 0.7
          }]
        }
      }).addTo(this.map);
    } else {
      // Fallback: simple polyline
      L.polyline([route.startCoord, route.endCoord], {
        color: this.getTransportColor(route.transport),
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 10'
      }).addTo(this.map);
    }

    // Fit map to route bounds
    const group = new L.featureGroup([startMarker, endMarker]);
    this.map.fitBounds(group.getBounds().pad(0.1));
  }

  // Get transport mode color
  getTransportColor(transport) {
    const colors = {
      bus: '#f56565',     // Red
      bike: '#48bb78',    // Green
      walk: '#ed8936',    // Orange
      car: '#667eea',     // Blue
      metro: '#9f7aea',   // Purple
      train: '#3182ce',   // Dark Blue
      auto: '#38b2ac'     // Teal
    };
    return colors[transport] || '#4a5568';
  }

  // Find matching routes
  findMatches(currentRoute) {
    const matches = this.getMatches(currentRoute);
    this.displayMatches(matches, currentRoute);
  }

  getMatches(currentRoute) {
    return this.routesDB.filter(route => {
      if (route.id === currentRoute.id) return false;

      // Calculate similarity score
      const startDistance = this.getDistance(
        currentRoute.startCoord[0], currentRoute.startCoord[1],
        route.startCoord[0], route.startCoord[1]
      );

      const endDistance = this.getDistance(
        currentRoute.endCoord[0], currentRoute.endCoord[1],
        route.endCoord[0], route.endCoord[1]
      );

      // Time difference in hours
      const timeDiff = Math.abs(new Date(currentRoute.time) - new Date(route.time)) / (1000 * 60 * 60);

      // Matching criteria
      const isNearbyStart = startDistance < 5; // Within 5km
      const isNearbyEnd = endDistance < 5;     // Within 5km
      const isSimilarTime = timeDiff < 2;      // Within 2 hours
      const isSameTransport = route.transport === currentRoute.transport;

      if (isNearbyStart && isNearbyEnd && isSimilarTime) {
        // Calculate similarity percentage
        const distanceScore = Math.max(0, 100 - (startDistance + endDistance) * 10);
        const timeScore = Math.max(0, 100 - timeDiff * 25);
        const transportBonus = isSameTransport ? 20 : 0;
        
        route.similarity = Math.min(100, Math.round((distanceScore + timeScore + transportBonus) / 2));
        return true;
      }

      return false;
    }).sort((a, b) => b.similarity - a.similarity);
  }

  // Display matched routes
  displayMatches(matches, currentRoute) {
    const matchesContainer = document.getElementById('matches');
    const noMatchesContainer = document.getElementById('noMatches');

    if (matches.length === 0) {
      noMatchesContainer.style.display = 'block';
      matchesContainer.innerHTML = '';
      return;
    }

    noMatchesContainer.style.display = 'none';
    matchesContainer.innerHTML = '';

    matches.forEach(match => {
      const matchCard = this.createMatchCard(match);
      matchesContainer.appendChild(matchCard);

      // Only add match markers for high-similarity matches (potential companions)
      if (match.similarity >= 70) {
        const matchMarker = L.marker([
          (match.startCoord[0] + match.endCoord[0]) / 2,
          (match.startCoord[1] + match.endCoord[1]) / 2
        ], {
          icon: this.icons.match
        }).addTo(this.map)
          .bindPopup(this.createMatchPopup(match));
      }
    });
  }

  createMatchCard(match) {
    const card = document.createElement('div');
    card.className = 'match-card';
    
    const timeFormat = new Date(match.time).toLocaleString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Check if this user is already connected
    const isConnected = match.connected || false;
    const isHighMatch = match.similarity >= 70;

    if (isConnected) {
      // Show full details for connected travelers
      card.innerHTML = `
        <div class="match-header">
          <div class="match-similarity connected-match">${match.similarity}% match • ✅ Connected</div>
        </div>
        <div class="match-route">
          ${match.start} → ${match.end}
        </div>
        <div class="match-details">
          <span>📅 ${timeFormat}</span>
          <span class="match-transport">${this.getTransportEmoji(match.transport)} ${match.transport.toUpperCase()}</span>
        </div>
        <div style="margin-top: 0.5rem; font-size: 0.85rem; opacity: 0.8;">
          👤 ${match.user.name} • 📏 ${match.distance.toFixed(1)} km • ⭐ ${match.user.rating}/5.0
        </div>
        <div class="match-actions" style="margin-top: 0.75rem;">
          <div class="connected-note">
            <i class="fas fa-check-circle"></i> Contact: ${match.user.contact}
          </div>
        </div>
      `;
    } else {
      // Show minimal info for non-connected travelers
      const routeLength = this.getDistance(match.startCoord[0], match.startCoord[1], match.endCoord[0], match.endCoord[1]);
      
      card.innerHTML = `
        <div class="match-header">
          <div class="match-similarity ${isHighMatch ? 'high-match' : 'low-match'}">${match.similarity}% route match</div>
        </div>
        <div class="match-route-hidden">
          <i class="fas fa-route"></i> ${routeLength.toFixed(1)} km route • ${this.getTransportEmoji(match.transport)} ${match.transport.toUpperCase()}
        </div>
        <div class="match-details">
          <span>📅 ${timeFormat}</span>
          <span class="privacy-note">👤 Details hidden for privacy</span>
        </div>
        <div style="margin-top: 0.5rem; font-size: 0.85rem; opacity: 0.8;">
          <i class="fas fa-lock"></i> Connect to see traveler details and route information
        </div>
        <div class="match-actions" style="margin-top: 0.75rem;">
          ${isHighMatch ? 
            `<button class="contact-btn" onclick="window.routifyApp.requestContact('${match.id}')">
              <i class="fas fa-handshake"></i> Connect to View Details
            </button>` : 
            `<div class="low-match-note">
              <i class="fas fa-info-circle"></i> ${match.similarity}% match - Too low for connection
            </div>`
          }
        </div>
      `;
    }

    card.addEventListener('click', () => {
      if (isConnected) {
        this.showConnectedMatchDetails(match);
      } else if (isHighMatch) {
        this.showPrivateMatchPrompt(match);
      } else {
        this.showLowMatchInfo(match);
      }
    });

    return card;
  }

  createMatchPopup(match) {
    return `
      <div style="text-align: center;">
        <strong>🎯 ${match.similarity}% Match</strong><br/>
        <strong>${match.start}</strong> → <strong>${match.end}</strong><br/>
        📅 ${new Date(match.time).toLocaleString()}<br/>
        ${this.getTransportEmoji(match.transport)} ${match.transport.toUpperCase()}<br/>
        👤 ${match.user.name}
      </div>
    `;
  }

  showConnectedMatchDetails(match) {
    const message = `
✅ Connected Travel Companion - ${match.similarity}% Match

👤 Traveler: ${match.user.name}
⭐ Rating: ${match.user.rating}/5.0
📧 Contact: ${match.user.contact}

📍 Full Route: ${match.start} → ${match.end}
📅 Time: ${new Date(match.time).toLocaleString()}
🚗 Transport: ${match.transport.toUpperCase()}
📏 Distance: ${match.distance.toFixed(1)} km

You are already connected and can share live location during travel.
    `;

    alert(message);
  }

  showPrivateMatchPrompt(match) {
    const routeDistance = this.getDistance(match.startCoord[0], match.startCoord[1], match.endCoord[0], match.endCoord[1]);
    
    const message = `
🔒 ${match.similarity}% Route Match - Privacy Protected

📊 Match Details:
• Route similarity: ${match.similarity}%
• Distance: ${routeDistance.toFixed(1)} km
• Transport: ${this.getTransportEmoji(match.transport)} ${match.transport.toUpperCase()}
• Time: ${new Date(match.time).toLocaleString()}

🔐 For your privacy and safety:
• Traveler details are hidden until you connect
• No personal information shared without consent
• Only high matches (70%+) can connect

Would you like to send a connection request to view full details?
    `;

    if (confirm(message)) {
      this.requestContact(match.id);
    }
  }

  showLowMatchInfo(match) {
    const message = `
ℹ️ ${match.similarity}% Route Match - Connection Not Available

This match has a similarity below 70%, so connection is not available for safety reasons.

You can only see:
• Match percentage: ${match.similarity}%
• Transport type: ${match.transport.toUpperCase()}
• General route distance

Personal details, exact route, and contact information are protected.

Try adjusting your route or timing to find higher similarity matches!
    `;

    alert(message);
  }

  showMatchDetails(match) {
    // This method is now replaced by showPrivateMatchPrompt for better privacy
    this.showPrivateMatchPrompt(match);
  }

  showBasicMatchInfo(match) {
    // This method is now replaced by showLowMatchInfo for consistency
    this.showLowMatchInfo(match);
  }

  requestContact(matchId) {
    const match = this.routesDB.find(route => route.id === matchId);
    if (!match) return;

    // Simulate contact request process
    const confirmed = confirm(`
🤝 Send Travel Companion Request

This will reveal your details to the other traveler and request their information:

Your Shared Info:
• Your name and contact details
• Your full route information
• Live location access during travel

Their Shared Info (if accepted):
• Their name: [Hidden until accepted]
• Their contact details
• Full route: [Hidden until accepted]
• Live location access during travel

Send connection request?
    `);

    if (confirmed) {
      this.showNotification(`🚀 Sending companion request...`, 'info');

      // Simulate successful connection after a delay
      setTimeout(() => {
        // Mark this match as connected
        match.connected = true;
        
        this.showNotification(`
✅ ${match.user.name} accepted your request!
📧 Contact: ${match.user.contact}
📍 Full route access granted
🌍 Live location sharing enabled
        `.trim(), 'success');

        // Refresh the matches display to show connected status
        this.findMatches(this.routesDB[this.routesDB.length - 1]); // Refresh current route matches
        
        // Add to connected travelers
        this.addConnectedTraveler(match);
      }, 2000);
    }
  }

  addConnectedTraveler(match) {
    // Add to live users as a connected traveler
    const connectedUsers = [
      { name: 'You', transport: 'active', location: this.currentUserLocation || [28.6139, 77.2090] },
      { name: match.user.name, transport: match.transport, location: match.startCoord, connected: true }
    ];

    this.updateLiveUsers(connectedUsers);
  }

  getTransportEmoji(transport) {
    const emojis = {
      bus: '🚌',
      bike: '🚴',
      walk: '🚶',
      car: '🚗',
      metro: '🚇',
      train: '🚆',
      auto: '🛺'
    };
    return emojis[transport] || '🚗';
  }

  // Calculate distance using Haversine formula
  getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Simulate live users for demo - but only show connected travelers
  startLocationSimulation() {
    // Only show connected travelers in live users
    setInterval(() => {
      if (this.isLocationSharing) {
        // Show only yourself initially
        const connectedTravelers = [
          { name: 'You', transport: 'active', location: this.currentUserLocation || [28.6139, 77.2090] }
        ];

        // Add any connected travelers from the routes database
        const connectedRoutes = this.routesDB.filter(route => route.connected);
        connectedRoutes.forEach(route => {
          connectedTravelers.push({
            name: route.user.name,
            transport: route.transport,
            location: route.startCoord,
            connected: true
          });
        });

        this.updateLiveUsers(connectedTravelers);
      } else {
        this.liveUsersContainer.innerHTML = '<p style="color: #a0aec0; text-align: center; padding: 1rem; font-size: 0.9rem;"><i class="fas fa-location-slash"></i><br/>Location sharing disabled<br/>Enable to see connected travelers</p>';
      }
    }, 3000);
  }

  updateLiveUsers(users) {
    const container = this.liveUsersContainer;
    container.innerHTML = '';

    if (!this.isLocationSharing) {
      container.innerHTML = '<p style="color: #a0aec0; text-align: center; padding: 1rem; font-size: 0.9rem;"><i class="fas fa-location-slash"></i><br/>Location sharing disabled<br/>Enable to see connected travelers</p>';
      return;
    }

    // Show only connected travelers or yourself
    const activeUsers = users.filter(user => 
      user.name === 'You' || user.connected || 
      (users.length === 1 && user.name !== 'You') // Demo users when no real connections
    );
    
    if (activeUsers.length === 0) {
      container.innerHTML = '<p style="color: #a0aec0; text-align: center; padding: 1rem; font-size: 0.9rem;"><i class="fas fa-user-friends"></i><br/>No connected travel companions<br/>Find matches to share live location</p>';
      return;
    }

    activeUsers.forEach(user => {
      const userElement = document.createElement('div');
      userElement.className = 'live-user';
      
      const status = user.name === 'You' ? 'sharing location' : 
                    user.connected ? 'connected traveler' : 'nearby';
      
      userElement.innerHTML = `
        <i class="fas fa-circle ${user.name === 'You' ? 'user-status' : user.connected ? 'connected-status' : ''}"></i>
        ${user.name} (${this.getTransportEmoji(user.transport)}) 
        <span class="user-status-text">${status}</span>
      `;
      container.appendChild(userElement);
    });
  }

  // Utility functions
  generateId() {
    return 'route_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateUserInfo() {
    const names = ['Alex', 'Sam', 'Jordan', 'Casey', 'Riley', 'Avery'];
    const name = names[Math.floor(Math.random() * names.length)];
    return {
      name: name,
      contact: `${name.toLowerCase()}@example.com`,
      rating: (Math.random() * 2 + 3).toFixed(1) // 3.0 to 5.0 rating
    };
  }

  clearMap() {
    // Clear all layers except the tile layer
    this.map.eachLayer((layer) => {
      if (layer !== this.map._layers[Object.keys(this.map._layers)[0]]) {
        this.map.removeLayer(layer);
      }
    });

    // Remove routing control
    if (this.routingControl) {
      this.map.removeControl(this.routingControl);
      this.routingControl = null;
    }

    // Re-add user marker if location is available
    if (this.currentUserLocation) {
      this.userMarker = L.marker(this.currentUserLocation, {
        icon: this.icons.user
      }).addTo(this.map)
        .bindPopup('<strong>📍 You are here</strong>')
        .openPopup();
    }

    // Clear matches
    document.getElementById('matches').innerHTML = '';
    document.getElementById('noMatches').style.display = 'block';

    this.showNotification('Map cleared successfully!', 'info');
  }

  async centerOnUser() {
    if (!this.currentUserLocation) {
      // Request location if not available
      const success = await this.requestLocationPermission();
      if (!success) {
        this.showNotification('Cannot center map. Please allow location access.', 'warning');
        return;
      }
    }
    
    if (this.currentUserLocation) {
      this.map.setView(this.currentUserLocation, 13);
      if (this.userMarker) {
        this.userMarker.openPopup();
      }
    }
  }

  showLoading(show) {
    this.loadingOverlay.style.display = show ? 'flex' : 'none';
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <i class="fas fa-${this.getNotificationIcon(type)}"></i>
      <span>${message}</span>
    `;

    // Add styles
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '1rem 1.5rem',
      backgroundColor: this.getNotificationColor(type),
      color: 'white',
      borderRadius: '10px',
      boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
      zIndex: '10001',
      transform: 'translateX(100%)',
      transition: 'transform 0.3s ease',
      maxWidth: '300px',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    });

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Auto remove
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }

  getNotificationIcon(type) {
    const icons = {
      success: 'check-circle',
      error: 'exclamation-triangle',
      warning: 'exclamation-circle',
      info: 'info-circle'
    };
    return icons[type] || 'info-circle';
  }

  getNotificationColor(type) {
    const colors = {
      success: '#48bb78',
      error: '#f56565',
      warning: '#ed8936',
      info: '#4299e1'
    };
    return colors[type] || '#4299e1';
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.routifyApp = new RoutifyApp();
});
