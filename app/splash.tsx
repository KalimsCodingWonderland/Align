import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { useRouter } from 'expo-router';
import { useTheme } from '../app/ThemeContext';

export default function SplashScreen() {
    const { theme } = useTheme();                 // light / dark
    const router    = useRouter();
    const videoRef  = useRef<Video>(null);

    /* choose assets + bg */
    const source = theme.mode === 'dark'
        ? require('../assets/AlignIntroDarkMode.mp4')
        : require('../assets/upscaledAlignIntro.mp4');

    const gradient: [string, string] = theme.mode === 'dark'
        ? ['#020202', '#020202']
        : ['#FFFFFF', '#FFFFFF'];

    /* gate the auto-redirect until we KNOW playback has started */
    const [timerStarted, setTimerStarted] = useState(false);

    /** navigate away */
    const goNext = () => router.replace('./userAuth');

    /* cleanup: clear timer if unmounting early */
    useEffect(() => {
        return () => clearTimeout((goNext as any)._t);
    }, []);

    return (
        <LinearGradient colors={gradient} style={styles.container}>
            <Video
                key={theme.mode}                 // force a fresh <Video/> mount on theme change
                ref={videoRef}
                source={source}
                style={styles.video}
                resizeMode={ResizeMode.CONTAIN}
                isLooping={false}
                /* ▶ We’ll play only AFTER onLoad fires */
                shouldPlay={false}
                onLoad={() => {
                    videoRef.current?.playAsync();         // start playback
                    if (!timerStarted) {
                        (goNext as any)._t = setTimeout(goNext, 3200);
                        setTimerStarted(true);
                    }
                }}
                onPlaybackStatusUpdate={(s) => {
                    if ('didJustFinish' in s && s.didJustFinish) goNext();
                }}
                onError={(e) => {
                    console.warn('Splash video error', e);
                    goNext();
                }}
            />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    video: {
        width: 600,
        height: 600,
        alignSelf: 'center',
    },
});
