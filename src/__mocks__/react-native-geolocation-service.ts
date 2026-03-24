// Mock for react-native-geolocation-service
const Geolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
  stopObserving: jest.fn(),
  requestAuthorization: jest.fn().mockResolvedValue('granted'),
};

export default Geolocation;
