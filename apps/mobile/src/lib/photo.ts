import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

const MAX_SIDE = 1280;

/**
 * Ambil foto dari kamera/galeri, lalu normalisasi: orientasi tegak, ≤1280 px, JPEG tanpa metadata lokasi.
 * Mengembalikan 'denied' bila izin ditolak, null bila dibatalkan.
 */
export async function pickPhoto(source: 'camera' | 'library'): Promise<string | 'denied' | null> {
  const perm =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return 'denied';

  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, exif: false };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets[0]) return null;

  const { uri, width, height } = res.assets[0];
  const ctx = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > MAX_SIDE) ctx.resize(width >= height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  const saved = await (await ctx.renderAsync()).saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
  return saved.uri;
}
