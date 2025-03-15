//app/splash.tsx

import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function SplashScreen() {
    const video = useRef(null);
    const router = useRouter();

    const handleVideoEnd = () => {
        router.replace('./userAuth');
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            router.replace('./userAuth');
        }, 3950); // safety fallback
        return () => clearTimeout(timer);
    }, []);

    return (
        <LinearGradient
            colors={['#d8d8d8', '#d3d3d3']} // top red, bottom blue
            style={styles.container}>
            <Video
                ref={video}
                source={require('../assets/AlignIntro.mp4')}
                style={styles.video}
                resizeMode={ResizeMode.STRETCH}
                isLooping={false}
                shouldPlay
                onPlaybackStatusUpdate={(status) => {
                    if ('didJustFinish' in status && status.didJustFinish) {
                        handleVideoEnd();
                    }
                }}
            />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    video: {
        left: 10,
        width: '250%',
        height: 900,
        alignSelf: 'center',
    },
});
