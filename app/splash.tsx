import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
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
        }, 3400);
        return () => clearTimeout(timer);
    }, []);

    return (
        <LinearGradient
            colors={['white', 'white']} // Replace these with your video's top and bottom colors
            style={styles.container}
        >
            <Video
                ref={video}
                source={require('../assets/upscaledAlignIntro.mp4')}
                style={styles.video}
                resizeMode={ResizeMode.CONTAIN}
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
        width: 600,
        height: 600,
        alignSelf: 'center',
        // Adjust 'top' or margins as needed to position your video
        marginTop: 140,
        zIndex: 2,
    },
});
