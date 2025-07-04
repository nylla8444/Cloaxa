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

function spoofCanvas() {
  try {
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
      value: function() {
        // Return a consistent, non-unique data URL
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='; // 1x1 transparent PNG
      },
      writable: true,
      configurable: true
    });

    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    Object.defineProperty(CanvasRenderingContext2D.prototype, 'getImageData', {
      value: function(sx, sy, sw, sh) {
        // Return ImageData with consistent, non-unique pixel data
        const imageData = originalGetImageData.call(this, sx, sy, sw, sh);
        for (let i = 0; i < imageData.data.length; i++) {
          imageData.data[i] = 0; // Set all pixels to black/transparent
        }
        return imageData;
      },
      writable: true,
      configurable: true
    });
    console.log('Canvas fingerprinting spoofed.');
  } catch (e) {
    console.error('Error spoofing canvas:', e);
  }
}

spoofTimezone();
spoofGeolocation();
spoofCanvas();
