/*
 * Enhanced Audio Quality Plugin
 * Copyright (c) 2025 pluckerpilple & 3Tb
 */

import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";

// Maximum possible bitrate
const MAX_BITRATE = 510000;

// Try to find the voice connection store
let VoiceConnection;
try {
    VoiceConnection = findByPropsLazy("getVoiceConnection");
} catch {}

export default definePlugin({
    name: "EnhancedAudioQuality",
    description: "Forces maximum audio quality (510kbps) for crystal clear voice",
    authors: [
        {
            name: "3Tb",
            id: 298055455614173184n
        }
    ],
    
    patches: [
        // Patch 1: Force maximum bitrate in voice settings
        {
            find: "audioEncoder:",
            replacement: [
                {
                    match: /audioEncoder:\{[^}]+\}/,
                    replace: "audioEncoder:{type:'opus',freq:48000,rate:48000,pacsize:960,channels:2}"
                }
            ]
        },
        // Patch 2: Override bitrate calculations
        {
            find: ".encodingVoiceBitRate",
            replacement: {
                match: /\.encodingVoiceBitRate\s*=\s*[^;]+/g,
                replace: `.encodingVoiceBitRate=${MAX_BITRATE}`
            }
        },
        // Patch 3: Force high quality mode
        {
            find: "voiceQuality:",
            replacement: {
                match: /voiceQuality:\w+/,
                replace: "voiceQuality:510000"
            }
        },
        // Patch 4: Disable automatic quality adjustment
        {
            find: "automaticGainControl",
            replacement: [
                {
                    match: /automaticGainControl:\w+/g,
                    replace: "automaticGainControl:false"
                },
                {
                    match: /noiseSuppression:\w+/g,
                    replace: "noiseSuppression:false"
                },
                {
                    match: /echoCancellation:\w+/g,
                    replace: "echoCancellation:false"
                }
            ]
        },
        // Patch 5: Force Opus codec settings
        {
            find: "opusEncoder",
            replacement: {
                match: /(\w+)\.opusEncoder\s*=\s*\{[^}]*\}/,
                replace: "$1.opusEncoder={type:'opus',freq:48000,rate:48000,pacsize:960,channels:2,bitrate:510000}"
            }
        }
    ],

    start() {
        // Hook into voice state updates
        this.forceQuality();
        
        // Set interval to keep forcing quality
        this.qualityInterval = setInterval(() => {
            this.forceQuality();
        }, 5000);

        console.log("[EnhancedAudioQuality] ✓ Activated - 510kbps forced");
    },

    stop() {
        if (this.qualityInterval) {
            clearInterval(this.qualityInterval);
        }
        console.log("[EnhancedAudioQuality] Deactivated");
    },

    forceQuality() {
        try {
            // Method 1: Direct MediaEngine manipulation
            if (window.DiscordNative?.nativeModules) {
                const voiceModule = window.DiscordNative.nativeModules.requireModule?.('discord_voice');
                if (voiceModule?.setTransportOptions) {
                    voiceModule.setTransportOptions({
                        audioEncoder: {
                            type: 'opus',
                            freq: 48000,
                            rate: 48000,
                            pacsize: 960,
                            channels: 2
                        },
                        encodingVoiceBitRate: MAX_BITRATE,
                        prioritySpeakerDucking: false
                    });
                }
            }

            // Method 2: WebRTC connection override
            if (VoiceConnection) {
                const connection = VoiceConnection.getVoiceConnection?.();
                if (connection?.conn) {
                    const pc = connection.conn;
                    
                    // Override sender parameters
                    if (pc.getSenders) {
                        pc.getSenders().forEach(sender => {
                            if (sender.track?.kind === 'audio') {
                                const params = sender.getParameters();
                                if (params.encodings) {
                                    params.encodings.forEach(encoding => {
                                        encoding.maxBitrate = MAX_BITRATE;
                                        encoding.priority = 'high';
                                        encoding.networkPriority = 'high';
                                    });
                                    sender.setParameters(params).catch(() => {});
                                }
                            }
                        });
                    }
                }
            }

            // Method 3: Override getUserMedia constraints
            if (navigator.mediaDevices?.getUserMedia) {
                const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
                navigator.mediaDevices.getUserMedia = function(constraints) {
                    if (constraints?.audio) {
                        if (typeof constraints.audio === 'object') {
                            constraints.audio.echoCancellation = false;
                            constraints.audio.noiseSuppression = false;
                            constraints.audio.autoGainControl = false;
                            constraints.audio.sampleRate = 48000;
                            constraints.audio.channelCount = 2;
                        }
                    }
                    return original(constraints);
                };
            }

        } catch (e) {
            // Silent fail - some methods might not be available
        }
    }
});