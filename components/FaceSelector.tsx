
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  LayoutChangeEvent,
  ImageSourcePropType,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { colors } from '@/styles/commonStyles';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FaceBox {
  /** pixel coordinates in the actual image */
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FaceSelectorProps {
  imageUri: string;
  /** Face bounding boxes in actual image pixel coordinates */
  faces: FaceBox[];
  /** Called with the cropped face URI after the user confirms */
  onConfirm: (croppedFaceUri: string) => void;
  onCancel: () => void;
}

// ─── Image source helper ──────────────────────────────────────────────────────

function resolveImageSource(source: string | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  return { uri: source };
}

// ─── Crop helper ──────────────────────────────────────────────────────────────

const CROP_PADDING = 20;

async function cropFaceFromUri(
  uri: string,
  face: FaceBox,
  imageWidth: number,
  imageHeight: number
): Promise<string> {
  try {
    const originX = Math.max(0, Math.round(face.x - CROP_PADDING));
    const originY = Math.max(0, Math.round(face.y - CROP_PADDING));
    const cropWidth = Math.min(
      imageWidth - originX,
      Math.round(face.width + CROP_PADDING * 2)
    );
    const cropHeight = Math.min(
      imageHeight - originY,
      Math.round(face.height + CROP_PADDING * 2)
    );

    console.log('[FaceSelector] Cropping face:', { originX, originY, cropWidth, cropHeight });

    const cropped = await ImageManipulator.manipulateAsync(
      uri,
      [{ crop: { originX, originY, width: cropWidth, height: cropHeight } }],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );
    console.log('[FaceSelector] Cropped face URI:', cropped.uri);
    return cropped.uri;
  } catch (err) {
    console.warn('[FaceSelector] Crop failed, using original:', err);
    return uri;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FaceSelector({
  imageUri,
  faces,
  onConfirm,
  onCancel,
}: FaceSelectorProps) {
  const [selectedFace, setSelectedFace] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Display dimensions of the rendered image container
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number } | null>(null);
  // Actual pixel dimensions of the source image
  const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number } | null>(null);

  // Reset state and auto-select when faces change
  useEffect(() => {
    console.log('[FaceSelector] Opened with', faces.length, 'face(s) for URI:', imageUri);
    setConfirming(false);
    setDisplaySize(null);
    setImageNaturalSize(null);

    if (faces.length === 1) {
      console.log('[FaceSelector] Auto-selecting single face (index 0)');
      setSelectedFace(0);
    } else {
      setSelectedFace(null);
    }

    Image.getSize(
      imageUri,
      (w, h) => {
        console.log('[FaceSelector] Natural image size:', w, 'x', h);
        setImageNaturalSize({ width: w, height: h });
      },
      (err) => console.warn('[FaceSelector] Image.getSize failed:', err)
    );
  }, [imageUri, faces]);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      console.log('[FaceSelector] Image container layout:', width, 'x', height);
      setDisplaySize({ width, height });
    }
  }, []);

  const handleConfirm = async () => {
    if (selectedFace === null || confirming) return;
    console.log('[FaceSelector] User pressed Conferma, face index:', selectedFace);
    setConfirming(true);
    try {
      const face = faces[selectedFace];
      const natW = imageNaturalSize?.width ?? 0;
      const natH = imageNaturalSize?.height ?? 0;
      const croppedUri = await cropFaceFromUri(imageUri, face, natW, natH);
      onConfirm(croppedUri);
    } finally {
      setConfirming(false);
    }
  };

  const handleCancelPress = () => {
    console.log('[FaceSelector] User pressed Annulla');
    setSelectedFace(null);
    onCancel();
  };

  // ── Compute scaled bounding boxes ──────────────────────────────────────────
  // Faces are in pixel coords of the natural image. Map them onto the displayed
  // image area, accounting for "contain" letterboxing.

  const scaledBoxes: { left: number; top: number; width: number; height: number }[] = [];

  if (displaySize && imageNaturalSize && displaySize.width > 0 && displaySize.height > 0) {
    const natW = imageNaturalSize.width;
    const natH = imageNaturalSize.height;
    const dispW = displaySize.width;
    const dispH = displaySize.height;

    // "contain" scale factor and letterbox offsets
    const scale = Math.min(dispW / natW, dispH / natH);
    const renderedW = natW * scale;
    const renderedH = natH * scale;
    const offsetX = (dispW - renderedW) / 2;
    const offsetY = (dispH - renderedH) / 2;

    for (const face of faces) {
      scaledBoxes.push({
        left: offsetX + face.x * scale,
        top: offsetY + face.y * scale,
        width: face.width * scale,
        height: face.height * scale,
      });
    }
  }

  const faceCountText =
    faces.length === 1 ? '1 volto rilevato' : `${faces.length} volti rilevati`;

  const confirmButtonLabel = confirming ? 'Ritaglio...' : 'Conferma';

  const isConfirmDisabled = selectedFace === null || confirming;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={handleCancelPress}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* Header */}
          <Text style={styles.title}>Seleziona un volto</Text>
          <Text style={styles.subtitle}>
            {faceCountText}
            {faces.length > 1 ? ' — tocca il riquadro del volto da usare' : ''}
          </Text>

          {/* Image with bounding box overlays */}
          <View style={styles.imageContainer} onLayout={handleLayout}>
            <Image
              source={resolveImageSource(imageUri)}
              style={styles.image}
              resizeMode="contain"
            />

            {/* Render face boxes once we have layout + natural size */}
            {scaledBoxes.map((box, index) => {
              const isSelected = selectedFace === index;
              const boxBorderColor = isSelected ? '#00FFFF' : 'white';
              const boxBorderWidth = isSelected ? 3 : 2;
              const boxBackground = isSelected
                ? 'rgba(0,200,255,0.2)'
                : 'rgba(255,255,255,0.1)';
              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.7}
                  onPress={() => {
                    console.log('[FaceSelector] User tapped face box index:', index);
                    setSelectedFace(index);
                  }}
                  style={[
                    styles.faceBox,
                    {
                      left: box.left,
                      top: box.top,
                      width: box.width,
                      height: box.height,
                      borderColor: boxBorderColor,
                      borderWidth: boxBorderWidth,
                      backgroundColor: boxBackground,
                    },
                  ]}
                >
                  {/* Face number label — top-left corner */}
                  <View style={[styles.faceLabel, isSelected && styles.faceLabelSelected]}>
                    <Text style={styles.faceLabelText}>
                      {index + 1}
                    </Text>
                  </View>
                  {/* Checkmark badge — bottom-right corner */}
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Loading spinner while computing boxes */}
            {(!displaySize || !imageNaturalSize) && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator color={colors.secondary} size="large" />
              </View>
            )}
          </View>

          {/* Instruction hint */}
          {faces.length > 1 && selectedFace === null && (
            <Text style={styles.hintText}>Tocca un riquadro per selezionare il volto</Text>
          )}

          {/* Buttons */}
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
                isConfirmDisabled && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={isConfirmDisabled}
              activeOpacity={0.8}
            >
              {confirming ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>{confirmButtonLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  content: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 500,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },

  // Image area
  imageContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  // Face bounding boxes
  faceBox: {
    position: 'absolute',
    borderRadius: 4,
  },

  // Face number label — top-left corner of box
  faceLabel: {
    position: 'absolute',
    top: -1,
    left: -1,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderBottomRightRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  faceLabelSelected: {
    backgroundColor: '#00FFFF',
  },
  faceLabelText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000',
  },

  // Checkmark badge — bottom-right corner of box
  checkBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#00FFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },

  hintText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },

  // Buttons
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
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
    backgroundColor: '#334155',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.background,
  },
});
