
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

  const screenWidth = Dimensions.get('window').width;
  const maxImageWidth = screenWidth - 40;

  const handleImageLoad = (event: any) => {
    const { width, height } = event.nativeEvent.source;
    const aspectRatio = width / height;
    const displayWidth = maxImageWidth;
    const displayHeight = displayWidth / aspectRatio;
    setImageSize({ width: displayWidth, height: displayHeight });
  };

  const handleConfirm = () => {
    if (selectedFace !== null) {
      onSelectFace(selectedFace);
    }
  };

  const faceCountText = faces.length === 1 ? '1 volto' : `${faces.length} volti`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
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
            {imageSize.width > 0 ? (
              <View style={{ position: 'relative' }}>
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: imageSize.width, height: imageSize.height }}
                  onLoad={handleImageLoad}
                />
                {faces.map((face, index) => {
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
                      onPress={() => setSelectedFace(index)}
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
            ) : (
              <View>
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: maxImageWidth, height: maxImageWidth * 1.33 }}
                  onLoad={handleImageLoad}
                />
                <ActivityIndicator
                  style={styles.loader}
                  color={colors.secondary}
                  size="large"
                />
              </View>
            )}
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { backgroundColor: colors.textSecondary }]}
              onPress={onCancel}
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
