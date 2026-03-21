// Mock react-native-mmkv for Jest
const storage: Record<string, string> = {};

export class MMKV {
  getString(key: string): string | undefined {
    return storage[key];
  }
  set(key: string, value: string): void {
    storage[key] = value;
  }
  delete(key: string): void {
    delete storage[key];
  }
}
