# 🚀 Routify - Smart Travel Planner

## Part C: Route Input + Map + Matching

A smart, privacy-focused, social travel planner for students & local commuters.

### 🛠️ Tech Stack
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Mapping**: Leaflet.js with OpenStreetMap (Free - No billing)
- **Routing**: Leaflet Routing Machine
- **Geocoding**: Nominatim API (Free)
- **Icons**: Font Awesome
- **Styling**: Modern CSS with animations

### ✨ Features

#### 🗺️ Route Planning
- Interactive route input form
- Real-time location detection
- Multiple transport modes (Bus, Bike, Walk, Car, Metro, Auto)
- Datetime picker for scheduling

#### 🌍 Interactive Mapping
- Live interactive map with OpenStreetMap
- Custom markers for different locations
- Route visualization with directions
- Map controls (clear, center, zoom)

#### 🤝 Smart Matching
- Advanced route matching algorithm using Haversine formula
- Similarity scoring based on:
  - Start/end proximity (within 5km)
  - Time similarity (within 2 hours)
  - Transport mode compatibility
- Visual match cards with percentage scores

#### 📍 Live Location Features
- Real-time location sharing toggle
- Live user tracking simulation
- Location-based route suggestions
- Privacy-focused location handling

#### 🎨 Modern UI/UX
- Responsive design for all devices
- Gradient backgrounds and animations
- Card-based layout
- Loading states and notifications
- Beautiful match visualization

### 📁 Project Structure

```
hustle squad/
├── index.html              # Main HTML file
├── README.md              # This file
├── assets/
│   ├── css/
│   │   └── style.css      # All styling
│   ├── js/
│   │   └── script.js      # Application logic
│   └── images/            # Future images/icons
└── src/                   # Future React components
```

### 🚀 How to Run

1. **Simple HTTP Server**:
   ```bash
   # Using Python (recommended)
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

2. **Open in Browser**:
   Navigate to `http://localhost:8000`

### 🔧 Features Implemented

#### Core Functionality
- ✅ Route form with start/end locations
- ✅ Transport mode selection
- ✅ Date/time picker
- ✅ Interactive map with Leaflet
- ✅ Real-time geocoding
- ✅ Route visualization

#### Advanced Features
- ✅ Smart matching algorithm
- ✅ Live location sharing
- ✅ Custom markers and popups
- ✅ Map routing with directions
- ✅ Responsive design
- ✅ Loading states
- ✅ Notifications system

#### Matching Logic
- ✅ Haversine distance calculation
- ✅ Proximity-based matching (5km radius)
- ✅ Time-based filtering (2-hour window)
- ✅ Transport mode compatibility
- ✅ Similarity percentage scoring

### 🎯 Usage Instructions

1. **Enter Route Details**:
   - Fill in start and end locations
   - Select preferred time
   - Choose transport mode

2. **Location Features**:
   - Click crosshairs button to use current location
   - Toggle location sharing for live updates

3. **View Results**:
   - See route on interactive map
   - Browse matched travelers
   - Check similarity scores
   - Connect with fellow travelers

### 🔄 Future Enhancements

- Real Firebase integration
- User authentication
- Chat system integration
- Push notifications
- Offline route caching
- Advanced filtering options

### 🌟 Key Advantages

1. **No API Costs**: Uses free OpenStreetMap and Nominatim
2. **Privacy-Focused**: Location data handled locally
3. **Mobile-Ready**: Responsive design for all devices
4. **Fast Performance**: Optimized JavaScript and CSS
5. **Extensible**: Modular code structure for easy expansion

---

**Ready to connect travelers and make commuting social! 🚀**
