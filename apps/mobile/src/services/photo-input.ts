import { Directory, File, Paths } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Linking } from 'react-native';

const MAX_IMAGE_EDGE = 1536;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export class CameraPermissionError extends Error {
  constructor(readonly canAskAgain: boolean) {
    super('Akses kamera diperlukan untuk memotret barang.');
    this.name = 'CameraPermissionError';
  }
}

export interface StoredPhoto {
  uri: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export async function chooseAndStorePhoto(source: 'camera' | 'library'): Promise<StoredPhoto | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new CameraPermissionError(permission.canAskAgain);
  }

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          exif: false,
          quality: 1,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          exif: false,
          quality: 1,
        });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  if (!asset.width || !asset.height) {
    throw new Error('Ukuran foto tidak terbaca. Pilih foto lain.');
  }

  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(asset.width, asset.height));
  const width = Math.max(1, Math.round(asset.width * scale));
  const height = Math.max(1, Math.round(asset.height * scale));
  const context = ImageManipulator.ImageManipulator.manipulate(asset.uri);
  context.resize({ width, height });
  const renderedImage = await context.renderAsync();

  let output: File | null = null;
  for (const compress of [0.86, 0.74, 0.62, 0.5, 0.38]) {
    const resultImage = await renderedImage.saveAsync({
      format: ImageManipulator.SaveFormat.JPEG,
      compress,
    });
    const candidate = new File(resultImage.uri);
    if (candidate.size <= MAX_FILE_BYTES) {
      output = candidate;
      break;
    }
    candidate.delete();
  }

  if (!output) {
    throw new Error('Foto masih lebih besar dari 5 MB setelah diperkecil. Pilih foto lain.');
  }

  const photoDirectory = new Directory(Paths.document, 'bekas-photos');
  if (!photoDirectory.exists) {
    photoDirectory.create({ idempotent: true, intermediates: true });
  }

  const filename = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const savedPhoto = new File(photoDirectory, filename);
  await output.copy(savedPhoto);
  output.delete();

  return {
    uri: savedPhoto.uri,
    width,
    height,
    sizeBytes: savedPhoto.size,
  };
}

export async function openDeviceSettings(): Promise<void> {
  await Linking.openSettings();
}
