function spoofTimezone() {
  try {
    Object.defineProperty(Intl.DateTimeFormat.prototype, 'resolvedOptions', {
      value: () => ({
        locale: 'en-US',
        timeZone: 'UTC',
        hour12: false,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        era: 'long',
        calendar: 'gregory',
        dayPeriod: 'long',
        numberingSystem: 'latn',
        dateStyle: 'full',
        timeStyle: 'full',
        formatMatcher: 'best fit'
      })
    });
    console.log('Timezone spoofed to UTC.');
  } catch (e) {
    console.error('Error spoofing timezone:', e);
  }
}

function spoofGeolocation() {
  try {
    const originalGeolocation = navigator.geolocation;

    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: function(success, error, options) {
          console.log('Geolocation request intercepted.');
          // Provide a generic location (e.g., Kansas, USA - central US)
          const fakePosition = {
            coords: {
              latitude: 39.0119,
              longitude: -98.4842,
              accuracy: 20000, // Low accuracy to indicate a general area
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null
            },
            timestamp: Date.now()
          };
          success(fakePosition);
        },
        watchPosition: function(success, error, options) {
          console.log('Geolocation watch request intercepted.');
          // For watchPosition, we can just call success once or periodically
          // For simplicity, we'll just call it once here.
          const fakePosition = {
            coords: {
              latitude: 39.0119,
              longitude: -98.4842,
              accuracy: 20000,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null
            },
            timestamp: Date.now()
          };
          success(fakePosition);
          return Math.floor(Math.random() * 10000); // Return a dummy watch ID
        },
        clearWatch: function(id) {
          console.log('Geolocation clearWatch intercepted.', id);
          // Do nothing as we don't have real watches
        }
      },
      writable: true,
      configurable: true
    });
    console.log('Geolocation spoofed.');
  } catch (e) {
    console.error('Error spoofing geolocation:', e);
  }
}

spoofTimezone();
spoofGeolocation();
