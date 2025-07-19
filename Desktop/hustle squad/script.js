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
    
    // Set default datetime to current time + 1 hour
    const now = new Date();
    now.setHours(now.getHours() + 1);
    document.getElementById('time').value = now.toISOString().slice(0, 16);
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
  }

  // Setup geolocation
  setupGeolocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.currentUserLocation = [latitude, longitude];
          this.map.setView([latitude, longitude], 13);
          
          // Add user marker
          if (this.userMarker) {
            this.map.removeLayer(this.userMarker);
          }
          
          this.userMarker = L.marker([latitude, longitude], {
            icon: this.icons.user
          }).addTo(this.map)
            .bindPopup('<strong>📍 You are here</strong><br/>Current Location')
            .openPopup();
        },
        (error) => {
          console.warn('Geolocation error:', error);
          this.showNotification('Location access denied. Using default location.', 'warning');
        }
      );
    }
  }

  // Use current location for start point
  useCurrentLocation() {
    if (this.currentUserLocation) {
      this.reverseGeocode(this.currentUserLocation[0], this.currentUserLocation[1])
        .then(address => {
          document.getElementById('start').value = address;
          this.showNotification('Current location set as start point!', 'success');
        });
    } else {
      this.showNotification('Location not available yet. Please wait...', 'warning');
    }
  }

  // Toggle live location sharing
  toggleLocationSharing(enabled) {
    const statusElement = document.getElementById('locationStatus');
    
    if (enabled) {
      this.startLocationSharing();
      statusElement.textContent = 'Enabled';
      statusElement.className = 'location-status enabled';
    } else {
      this.stopLocationSharing();
      statusElement.textContent = 'Disabled';
      statusElement.className = 'location-status disabled';
    }
    
    this.isLocationSharing = enabled;
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

      // Reset form
      this.form.reset();
      
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

      // Add match markers to map
      const matchMarker = L.marker([
        (match.startCoord[0] + match.endCoord[0]) / 2,
        (match.startCoord[1] + match.endCoord[1]) / 2
      ], {
        icon: this.icons.match
      }).addTo(this.map)
        .bindPopup(this.createMatchPopup(match));
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

    card.innerHTML = `
      <div class="match-header">
        <div class="match-similarity">${match.similarity}% match</div>
      </div>
      <div class="match-route">
        ${match.start} → ${match.end}
      </div>
      <div class="match-details">
        <span>📅 ${timeFormat}</span>
        <span class="match-transport">${this.getTransportEmoji(match.transport)} ${match.transport.toUpperCase()}</span>
      </div>
      <div style="margin-top: 0.5rem; font-size: 0.85rem; opacity: 0.8;">
        👤 ${match.user.name} • 📏 ${match.distance.toFixed(1)} km
      </div>
    `;

    card.addEventListener('click', () => {
      this.showMatchDetails(match);
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

  showMatchDetails(match) {
    const message = `
🎯 ${match.similarity}% Route Match!

📍 Route: ${match.start} → ${match.end}
📅 Time: ${new Date(match.time).toLocaleString()}
🚗 Transport: ${match.transport.toUpperCase()}
📏 Distance: ${match.distance.toFixed(1)} km
👤 Traveler: ${match.user.name}

Would you like to connect with this traveler?
    `;

    if (confirm(message)) {
      this.showNotification(`Great! Contact details: ${match.user.contact}`, 'success');
    }
  }

  getTransportEmoji(transport) {
    const emojis = {
      bus: '🚌',
      bike: '🚴',
      walk: '🚶',
      car: '🚗',
      metro: '🚇',
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

  // Simulate live users for demo
  startLocationSimulation() {
    const demoUsers = [
      { name: 'Rahul', transport: 'metro', location: [28.6139, 77.2090] },
      { name: 'Priya', transport: 'bus', location: [28.6304, 77.2177] },
      { name: 'Amit', transport: 'bike', location: [28.5935, 77.2014] },
      { name: 'Sneha', transport: 'car', location: [28.6129, 77.2295] }
    ];

    let currentIndex = 0;

    setInterval(() => {
      if (this.isLocationSharing) {
        this.updateLiveUsers(demoUsers);
      }
      currentIndex = (currentIndex + 1) % demoUsers.length;
    }, 5000);
  }

  updateLiveUsers(users) {
    const container = this.liveUsersContainer;
    container.innerHTML = '';

    const activeUsers = users.slice(0, Math.floor(Math.random() * 3) + 1);
    
    activeUsers.forEach(user => {
      const userElement = document.createElement('div');
      userElement.className = 'live-user';
      userElement.innerHTML = `
        <i class="fas fa-circle"></i>
        ${user.name} (${this.getTransportEmoji(user.transport)})
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

  centerOnUser() {
    if (this.currentUserLocation) {
      this.map.setView(this.currentUserLocation, 13);
      if (this.userMarker) {
        this.userMarker.openPopup();
      }
    } else {
      this.showNotification('Location not available. Please enable location services.', 'warning');
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
