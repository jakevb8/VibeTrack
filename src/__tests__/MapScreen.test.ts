import {geocodeLocation} from '../screens/MapScreen';

const FAKE_TOKEN = 'test-token';

describe('geocodeLocation', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns [lng, lat] coordinates for a valid query', async () => {
    const mockCenter: [number, number] = [-122.4194, 37.7749];
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({features: [{center: mockCenter}]}),
    } as Response);

    const result = await geocodeLocation('San Francisco', FAKE_TOKEN);

    expect(result).toEqual(mockCenter);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('San%20Francisco'),
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining(`access_token=${FAKE_TOKEN}`),
    );
  });

  it('returns null when features array is empty', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({features: []}),
    } as Response);

    const result = await geocodeLocation('nowhere12345xyzzy', FAKE_TOKEN);

    expect(result).toBeNull();
  });

  it('returns null when response is not ok', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response);

    const result = await geocodeLocation('anything', FAKE_TOKEN);

    expect(result).toBeNull();
  });

  it('propagates fetch errors', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network error'));

    await expect(geocodeLocation('bad', FAKE_TOKEN)).rejects.toThrow(
      'Network error',
    );
  });

  it('URL-encodes special characters in the query', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({features: [{center: [2.3522, 48.8566]}]}),
    } as Response);

    await geocodeLocation('Paris, France', FAKE_TOKEN);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('Paris%2C%20France'),
    );
  });
});
