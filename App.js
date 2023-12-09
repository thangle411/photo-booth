import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Button, StyleSheet, View, SafeAreaView, Image, FlatList, Dimensions, Text } from 'react-native';
import { Camera } from 'expo-camera';
import { shareAsync } from 'expo-sharing';
import * as ScreenOrientation from 'expo-screen-orientation';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { sleep } from './misc';

export default function App() {
  const [hasCameraPermission, setHasCameraPermission] = useState();
  const [photos, setPhotos] = useState([]);
  const [photoCount, setPhotoCount] = useState(0);
  const [count, setCount] = useState(0);
  const [status, requestPermission] = MediaLibrary.usePermissions();
  const cameraRef = useRef();
  const captureViewRef = useRef();

  useEffect(() => {
    (async () => {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT);

      if (status === null) {
        requestPermission();
      }
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(cameraPermission.status === 'granted');
    })();
  }, []);

  const takePic = async () => {
    setCount(0);
    if (photoCount < 3) {
      let count = 0;
      while (count < 3) {
        await sleep(1000);
        setCount(count + 1);
        count = count + 1;
      }

      let options = {
        quality: 1,
        base64: true,
        exif: false,
      };

      let newPhoto = await cameraRef.current.takePictureAsync(options);
      setPhotos(prevPhotos => [...prevPhotos, newPhoto]);
      setPhotoCount(prevCount => {
        if (prevCount === 2) {
          // Take three photos and then share or discard
          setPhotoCount(0);
          setCount(0);
        }
        if (prevCount < 2) {
          takePic();
        }
        return prevCount + 1;
      });
    }
  };

  const captureAndSave = async () => {
    try {
      const result = await captureRef(captureViewRef, {
        quality: 1,
      });

      await MediaLibrary.saveToLibraryAsync(result);
      if (result) {
        alert('Saved!');
      }
      console.log('Captured image URI:', result);
      return result;
    } catch (error) {
      console.error('Error capturing view:', error);
      return null;
    }
  };

  const sharePhotos = async () => {
    const collage = captureAndSave();
    if (!collage) return;
    let results = await MediaLibrary.getAssetsAsync({ first: 1 });
    let asset = results.assets[0];

    if (!asset) {
      alert('No images available!');
      return;
    }

    shareAsync(uri);
    // setPhotos([]);
  };

  const discardPhotos = () => {
    setPhotos([]);
    setPhotoCount(0);
  };

  const renderItem = ({ item }) => (
    <Image style={styles.thumbnail} source={{ uri: 'data:image/jpg;base64,' + item.base64 }} />
  );

  const renderCollage = ({ item }) => (
    <Image style={styles.collageItem} source={{ uri: 'data:image/jpg;base64,' + item.base64 }} />
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.innerContainer}>
        {photos.length < 3 && (
          <Camera
            style={styles.camera}
            type={Camera.Constants.Type.front}
            autoFocus={true}
            zoom={0}
            faceDetectorSettings={{ mode: 'accurate' }}
            ref={cameraRef}
          >
            <View style={styles.buttonContainer}>
              <Button title='Take Pic' onPress={takePic} />
            </View>
            <StatusBar style='auto' />
          </Camera>
        )}
        <View style={styles.preview}>
          {photos.length > 0 && photos.length < 3 && (
            <FlatList
              data={photos}
              renderItem={renderItem}
              keyExtractor={(item, index) => index.toString()}
              numColumns={3}
            />
          )}
        </View>
        {photos.length === 3 && (
          <View style={styles.collage} ref={captureViewRef}>
            <FlatList
              data={photos}
              renderItem={renderCollage}
              keyExtractor={(item, index) => index.toString()}
              numColumns={2}
              numRows={2}
            />
          </View>
        )}
        {photos.length === 3 && (
          <View style={styles.shareDiscardContainer}>
            <Button title='Share' onPress={sharePhotos} />
            <Button title='Discard' onPress={discardPhotos} />
          </View>
        )}
        {count > 0 && <Text style={styles.count}>{count}</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
  },
  camera: { width: '100%', height: '100%' },
  count: {
    position: 'absolute',
    fontSize: 120,
    fontWeight: 600,
    color: 'white',
    top: '30%',
    left: '45%',
  },
  preview: {
    position: 'absolute',
    top: 0,
  },
  collage: {
    width: '100%',
    height: '100%',
    display: 'grid',
  },
  collageItem: {
    width: '50%',
    height: Dimensions.get('window').height / 2.25,
    margin: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#fff',
    alignSelf: 'flex-end',
    margin: 20,
    position: 'absolute',
    left: 0,
    bottom: 0,
  },
  shareDiscardContainer: {
    flexDirection: 'column',
    justifyContent: 'space-around',
    backgroundColor: 'off-white',
    alignSelf: 'flex-end',
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  thumbnail: {
    width: 80,
    height: 80,
    margin: 5,
  },
});
