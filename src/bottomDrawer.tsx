import React, {
  useState,
  useRef,
  useImperativeHandle,
  ForwardRefRenderFunction,
  forwardRef,
  useEffect,
} from 'react';
import {
  View,
  Text,
  Modal,
  Animated,
  PanResponder,
  Pressable,
  Easing,
  Keyboard,
  TextInput,
} from 'react-native';
import { ChevronUp } from 'lucide-react-native';
import { styles } from './styles';
import {
  BottomDrawerMethods,
  BottomDrawerWithRef,
  SnapToPositionConfig,
} from '..';
import { BottomSheetContext } from './hooks/useBottomDrawer';
import {
  defaultBackdropColor,
  defaultBackdropOpacity,
  defaultCloseDuration,
  defaultGestureMode,
  defaultInitialHeight,
  defaultInitialIndex,
  defaultOpenDuration,
  defaultSnapPoints,
  defaultSafeTopOffset,
  screenHeight,
} from './constants';
import useBottomDrawerKeyboard from './hooks/useBottomDrawerKeyboard';

const BottomDrawer: ForwardRefRenderFunction<
  BottomDrawerMethods,
  BottomDrawerWithRef
> = (props, ref) => {
  const {
    onClose = null,
    openDuration = defaultOpenDuration,
    closeDuration = defaultCloseDuration,
    customStyles = {
      handleContainer: {}, handle: {}, container: {
        backgroundColor: "#172F35"
      }
    },
    onOpen = null,
    closeOnDragDown = false, // Disable closing by dragging down
    closeOnPressBack = true,
    backdropOpacity = defaultBackdropOpacity,
    onBackdropPress = null,
    closeOnBackdropPress = true,
    initialHeight = defaultInitialHeight,
    children,
    openOnMount = false,
    backdropColor = defaultBackdropColor,
    snapPoints = defaultSnapPoints,
    initialIndex = defaultInitialIndex,
    enableSnapping = true,
    gestureMode = 'handle', // Force handle-only gesture mode
    overDrag = true,
    safeTopOffset = defaultSafeTopOffset,
    onBackPress = null,
  } = props;

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [currentDrawerIndex, setCurrentDrawerIndex] = useState<number>(initialIndex);
  const animatedHeight = useRef(new Animated.Value(screenHeight)).current;
  const lastPosition = useRef<number>(initialHeight);
  const currentIndex = useRef<number>(initialIndex);
  const contentRef = useRef<View>(null);
  const [keyboardTriggerSource, setKeyboardTriggerSource] = useState<'internal' | 'external' | null>(null);

  const checkIfAvailable = (index: number) => {
    if (!enableSnapping || snapPoints.length <= index || index < 0) {
      return false;
    }
    return true;
  };

  const handleOpen = (sheetHeight: number = initialHeight) => {
    const _val = enableSnapping ? snapPoints[initialIndex] : sheetHeight;
    lastPosition.current = _val;
    setModalVisible(true);
    Animated.timing(animatedHeight, {
      useNativeDriver: true,
      toValue: screenHeight - _val,
      easing: Easing.out(Easing.back(1)),
      duration: openDuration,
    }).start(({ finished }) => {
      if (finished) {
        onOpen && onOpen();
      }
    });
  };

  useEffect(() => {
    openOnMount && handleOpen();
  }, []);

  const handleClose = () => {
    Animated.timing(animatedHeight, {
      useNativeDriver: true,
      toValue: screenHeight,
      easing: Easing.in(Easing.ease),
      duration: closeDuration,
    }).start(() => {
      onClose && onClose();
      setModalVisible(false);
      currentIndex.current = 0;
    });
  };

  const handleSnapToIndex = (index: number) => {
    if (!checkIfAvailable(index)) {
      throw Error('Provided index is out of range of snapPoints!');
    }
    lastPosition.current = snapPoints[index];
    currentIndex.current = index;
    setCurrentDrawerIndex(index);
    Animated.spring(animatedHeight, {
      useNativeDriver: true,
      toValue: screenHeight - snapPoints[index],
    }).start();
  };

  const handleSnapToPosition = (
    position: number,
    config?: SnapToPositionConfig,
  ) => {
    const { resetLastPosition = true } = config || {};
    if (!modalVisible) {
      return console.warn(
        'snapToPosition can be used only when bottom drawer is opened',
      );
    }
    if (resetLastPosition) {
      lastPosition.current = position;
    }
    Animated.spring(animatedHeight, {
      useNativeDriver: true,
      toValue: screenHeight - position,
    }).start();
  };

  const { keyboardOpen } = useBottomDrawerKeyboard({
    modalVisible,
    lastPosition,
    handleSnapToPosition,
    safeTopOffset,
    onKeyboardChange: (isOpen) => {
      if (isOpen) {
        // Determine keyboard trigger source
        const activeInputIsInternal = findActiveInputInContent();
        setKeyboardTriggerSource(activeInputIsInternal ? 'internal' : 'external');
      } else {
        setKeyboardTriggerSource(null);
      }
    },
  });

  // Find if the active input is within the drawer's content
  const findActiveInputInContent = (): boolean => {
    // This is a placeholder. In a real implementation, you'd use
    // something like React Native's findNodeHandle or a ref system
    return false;
  };

  // Handle keyboard-related snapping
  useEffect(() => {
    if (keyboardOpen) {
      if (keyboardTriggerSource === 'external') {
        // If keyboard was triggered by an external input, snap to first index
        handleSnapToIndex(0);
      } else if (keyboardTriggerSource === 'internal') {
        // If keyboard was triggered by an internal input, snap to second index
        handleSnapToIndex(1);
      }
    }
  }, [keyboardOpen, keyboardTriggerSource]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        const { dy } = gestureState;
        if (dy < -safeTopOffset && checkIfAvailable(currentIndex.current + 1)) {
          handleSnapToIndex(currentIndex.current + 1);
        } else if (dy > safeTopOffset && checkIfAvailable(currentIndex.current - 1)) {
          handleSnapToIndex(currentIndex.current - 1);
        }
      },
      onPanResponderRelease: () => {
        Animated.spring(animatedHeight, {
          toValue: screenHeight - lastPosition.current,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  const handleIsOpen = () => modalVisible;

  const bottomSheetMethods = {
    open: handleOpen,
    snapToPosition: handleSnapToPosition,
    snapToIndex: handleSnapToIndex,
    close: handleClose,
    isOpen: handleIsOpen,
  };

  useImperativeHandle(ref, (): any => bottomSheetMethods);

  return (
    <Animated.View
      ref={contentRef}
      style={[
        styles.container,
        customStyles.container,
        { transform: [{ translateY: animatedHeight }] },
      ]}>
      <View
        {...panResponder.panHandlers}
        style={[styles.handleContainer, customStyles.handleContainer]}>
        <View style={[styles.handle, customStyles.handle]} />
      </View>
      <BottomSheetContext.Provider value={bottomSheetMethods}>
        {currentDrawerIndex === 0 ? (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingInline: 20,
              marginTop: -15
            }}
          >
            <Text
              style={[
                {
                  color: '#FFFFFF',
                  fontSize: 22,
                  marginTop: 5,
                  fontWeight: 600,
                },
              ]}
            >
              Enter code
            </Text>
            <Pressable onPress={() => handleSnapToIndex(1)}>
              <ChevronUp
                color="#172F35"
                size={40}
                style={{
                  backgroundColor: "#FFF",
                  borderRadius: "50%"
                }}
              />
            </Pressable>

          </View>
        ) : (
          children
        )}
      </BottomSheetContext.Provider>
    </Animated.View>
  );
};

export default forwardRef(BottomDrawer);