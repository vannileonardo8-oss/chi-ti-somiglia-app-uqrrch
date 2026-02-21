
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
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

export function FaceSelector({ visible, imageUri, faces, onSelectFace, onCancel }: FaceSelectorProps) {
  const [selectedFace, setSelectedFace] = useState<number | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const screenWidth = Dimensions.get('window').width;
  const maxImageWidth = screenWidth - 40;

  const handleImageLoad = (event: any) => {
    console.log('[FaceSelector] Image load event:', event.nativeEvent);
    
    try {
      let width = 0;
      let height = 0;

      if (Platform.OS === 'web') {
        // On web, dimensions are in event.nativeEvent directly
        width = event.nativeEvent.width || 0;
        height = event.nativeEvent.height || 0;
        
        // Fallback: try to get from target element
        if (!width && event.target) {
          width = event.target.naturalWidth || event.target.width || 0;
          height = event.target.naturalHeight || event.target.height || 0;
        }
      } else {
        // On native, dimensions are in event.nativeEvent.source
        const source = event.nativeEvent.source;
        if (source) {
          width = source.width || 0;
          height = source.height || 0;
        }
      }

      console.log('[FaceSelector] Image dimensions:', { width, height });

      if (width > 0 && height > 0) {
        const aspectRatio = width / height;
        const displayWidth = maxImageWidth;
        const displayHeight = displayWidth / aspectRatio;
        setImageSize({ width: displayWidth, height: displayHeight });
        setImageLoaded(true);
      } else {
        console.warn('[FaceSelector] Could not determine image dimensions, using fallback');
        // Fallback: use a default aspect ratio (3:4)
        const displayWidth = maxImageWidth;
        const displayHeight = displayWidth * (4 / 3);
        setImageSize({ width: displayWidth, height: displayHeight });
        setImageLoaded(true);
      }
    } catch (error) {
      console.error('[FaceSelector] Error in handleImageLoad:', error);
      // Fallback on error
      const displayWidth = maxImageWidth;
      const displayHeight = displayWidth * (4 / 3);
      setImageSize({ width: displayWidth, height: displayHeight });
      setImageLoaded(true);
    }
  };

  const handleConfirm = () => {
    if (selectedFace !== null) {
      onSelectFace(selectedFace);
      // Reset state for next use
      setSelectedFace(null);
      setImageLoaded(false);
      setImageSize({ width: 0, height: 0 });
    }
  };

  const handleCancelPress = () => {
    // Reset state
    setSelectedFace(null);
    setImageLoaded(false);
    setImageSize({ width: 0, height: 0 });
    onCancel();
  };

  const faceCountText = faces.length === 1 ? '1 volto' : `${faces.length} volti`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancelPress}
    >
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            Seleziona un volto
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Rilevati {faceCountText}. Tocca il volto da usare per il confronto.
          </Text>

          <View style={styles.imageContainer}>
            <View style={{ position: 'relative' }}>
              <Image
                source={{ uri: imageUri }}
                style={
                  imageLoaded && imageSize.width > 0
                    ? { width: imageSize.width, height: imageSize.height }
                    : { width: maxImageWidth, height: maxImageWidth * 1.33 }
                }
                onLoad={handleImageLoad}
                resizeMode="contain"
              />
              
              {!imageLoaded && (
                <ActivityIndicator
                  style={styles.loader}
                  color={colors.secondary}
                  size="large"
                />
              )}

              {imageLoaded && imageSize.width > 0 && faces.map((face, index) => {
                const scaleX = imageSize.width / 100;
                const scaleY = imageSize.height / 100;
                const isSelected = selectedFace === index;
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.faceBox,
                      {
                        left: face.x * scaleX,
                        top: face.y * scaleY,
                        width: face.width * scaleX,
                        height: face.height * scaleY,
                        borderColor: isSelected ? colors.secondary : colors.accent,
                        borderWidth: isSelected ? 4 : 2,
                        backgroundColor: isSelected ? 'rgba(255, 193, 7, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      },
                    ]}
                    onPress={() => {
                      console.log('[FaceSelector] Face selected:', index);
                      setSelectedFace(index);
                    }}
                    activeOpacity={0.7}
                  >
                    {isSelected && (
                      <View style={[styles.checkmark, { backgroundColor: colors.secondary }]}>
                        <Text style={styles.checkmarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { backgroundColor: colors.textSecondary }]}
              onPress={handleCancelPress}
            >
              <Text style={[styles.buttonText, { color: colors.background }]}>
                Annulla
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                { backgroundColor: selectedFace !== null ? colors.secondary : '#666' },
              ]}
              onPress={handleConfirm}
              disabled={selectedFace === null}
            >
              <Text style={[styles.buttonText, { color: colors.background }]}>
                Conferma
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
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  faceBox: {
    position: 'absolute',
    borderRadius: 8,
  },
  checkmark: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {},
  confirmButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
