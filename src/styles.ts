import { StyleSheet } from 'react-native';
import { screenHeight } from './constants';

export const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    position: 'absolute',
    bottom: -40,
    left: 0,
    right: 0,
    borderRadius: 20,
    height: screenHeight,
    zIndex: 100,
  },
  handleContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    height: 30,
  },
  handle: {
    backgroundColor: '#D9D9D9',
    width: 62,
    height: 5,
    borderRadius: 10,
  },
});
