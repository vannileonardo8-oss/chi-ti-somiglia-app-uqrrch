
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { colors } from '@/styles/commonStyles';

interface Face {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FaceSelectorProps {
  visible: boolean;
  imageUri: string;
  faces: Face[];
  onSelectFace: (faceIndex: number) => void;
  onCancel: () => void;
}

interface FaceThumbnail {
  index: number;
  uri: string;
}

const THUMB_SIZE = 100;
const screenWidth = Dimensions.get('window').width;

async function cropFaceThumbnail(uri: string, face: Face): Promise<string> {
  try {
    const info = await ImageManipulator.manipulateAsync(uri, [], {
      format: ImageManipulator.SaveFormat.JPEG,
    });
    const imgWidth = info.width;
    const imgHeight = info.height;

    // Add padding around the face (20% on each side)
    const padX = face.width * 0.2;
    const padY = face.height * 0.2;

    const rawX = (face.x - padX) / 100;
    const rawY = (face.y - padY) / 100;
    const rawW = (face.width + padX * 2) / 100;
    const rawH = (face.height + padY * 2) / 100;

    const originX = Math.max(0, Math.round(rawX * imgWidth));
    const originY = Math.max(0, Math.round(rawY * imgHeight));
    const cropWidth = Math.min(imgWidth - originX, Math.round(rawW * imgWidth));
    const cropHeight = Math.min(imgHeight - originY, Math.round(rawH * imgHeight));

    const cropped = await ImageManipulator.manipulateAsync(
      uri,
      [{ crop: { originX, originY, width: cropWidth, height: cropHeight } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    return cropped.uri;
  } catch (err) {
    console.warn('[FaceSelector] Thumbnail crop failed:', err);
    return uri;
  }
}

export function FaceSelector({ visible, imageUri, faces, onSelectFace, onCancel }: FaceSelectorProps) {
  const [selectedFace, setSelectedFace] = useState<number | null>(null);
  const [thumbnails, setThumbnails] = useState<FaceThumbnail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible || !imageUri || faces.length === 0) return;

    setSelectedFace(null);
    setThumbnails([]);
    setLoading(true);

    console.log('[FaceSelector] Generating thumbnails for', faces.length, 'faces');

    Promise.all(
      faces.map(async (face, index) => {
        const uri = await cropFaceThumbnail(imageUri, face);
        return { index, uri };
      })
    )
      .then((results) => {
        console.log('[FaceSelector] Thumbnails ready:', results.length);
        setThumbnails(results);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[FaceSelector] Failed to generate thumbnails:', err);
        setLoading(false);
      });
  }, [visible, imageUri, faces]);

  const handleConfirm = () => {
    if (selectedFace !== null) {
      console.log('[FaceSelector] Confirming face selection:', selectedFace);
      onSelectFace(selectedFace);
      setSelectedFace(null);
      setThumbnails([]);
    }
  };

  const handleCancelPress = () => {
    console.log('[FaceSelector] Cancelled');
    setSelectedFace(null);
    setThumbnails([]);
    onCancel();
  };

  const faceCountText = faces.length === 1 ? '1 volto rilevato' : `${faces.length} volti rilevati`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancelPress}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Seleziona un volto</Text>
          <Text style={styles.subtitle}>
            {faceCountText}. Tocca il volto da usare per il confronto.
          </Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.secondary} size="large" />
              <Text style={styles.loadingText}>Preparazione volti...</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailsRow}
            >
              {thumbnails.map((thumb) => {
                const isSelected = selectedFace === thumb.index;
                return (
                  <TouchableOpacity
                    key={thumb.index}
                    style={[
                      styles.thumbWrapper,
                      isSelected && styles.thumbWrapperSelected,
                    ]}
                    onPress={() => {
                      console.log('[FaceSelector] Tapped face thumbnail:', thumb.index);
                      setSelectedFace(thumb.index);
                    }}
                    activeOpacity={0.75}
                  >
                    <Image
                      source={{ uri: thumb.uri }}
                      style={styles.thumbImage}
                      resizeMode="cover"
                    />
                    {isSelected && (
                      <View style={styles.checkBadge}>
                        <Text style={styles.checkText}>✓</Text>
                      </View>
                    )}
                    <Text style={styles.thumbLabel}>
                      Volto {thumb.index + 1}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancelPress}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Annulla</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                selectedFace === null && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={selectedFace === null}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmButtonText}>
                {selectedFace !== null ? 'Conferma' : 'Seleziona un volto'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 480,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  thumbnailsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
    paddingBottom: 8,
    minWidth: '100%',
    justifyContent: 'center',
  },
  thumbWrapper: {
    alignItems: 'center',
    gap: 6,
    borderRadius: 16,
    padding: 6,
    borderWidth: 3,
    borderColor: 'transparent',
    backgroundColor: colors.cardDark,
  },
  thumbWrapperSelected: {
    borderColor: colors.secondary,
    backgroundColor: 'rgba(252, 211, 77, 0.15)',
  },
  thumbImage: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
    backgroundColor: colors.backgroundDark,
  },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: 'bold',
  },
  thumbLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.cardDark,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  confirmButton: {
    backgroundColor: colors.secondary,
  },
  confirmButtonDisabled: {
    backgroundColor: '#555',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.background,
  },
});
