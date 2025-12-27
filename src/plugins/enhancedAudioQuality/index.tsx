/*
 * Enhanced Audio Quality Plugin
 * Copyright (c) 2025 pluckerpilple & 3Tb
 */

import definePlugin from "@utils/types";

const MAX_BITRATE = 510000;
const AUDIO_CONFIG = {
    channels: 2,
    rate: 48000,
    freq: MAX_BITRATE,
    pacsize: 960
};

export default definePlugin({
    name: "EnhancedAudioQuality",
    description: "Forces maximum audio quality (510kbps) and prevents Discord from changing it",
    authors: [
        {
            name: "3Tb",
            id: 298055455614173184n
        }
    ],
    
    patches: [
        {
            // Intercept setTransportOptions to force our settings
            find: "setTransportOptions",
            replacement: {
                match: /(setTransportOptions\s*:\s*function\s*\([^)]+\)\s*{)/,
                replace: "$1return $self.forceAudioQuality(arguments[0]);"
            }
        },
        {
            // Force encoding bitrate
            find: "encodingVoiceBitRate",
            replacement: {
                match: /encodingVoiceBitRate:\d+/g,
                replace: `encodingVoiceBitRate:${MAX_BITRATE}`
            }
        },
        {
            // Remove packet loss
            find: "packetLossRate",
            replacement: {
                match: /packetLossRate:[^,}]+/g,
                replace: "packetLossRate:0"
            }
        },
        {
            // Force legacy audio subsystem
            find: '"audioSubsystem"',
            replacement: {
                match: /audioSubsystem:["']\w+["']/g,
                replace: 'audioSubsystem:"legacy"'
            }
        }
    ],

    forceAudioQuality(options) {
        if (!options) return options;

        // Force our audio encoder settings
        if (options.audioEncoder) {
            Object.assign(options.audioEncoder, AUDIO_CONFIG);
        } else {
            options.audioEncoder = { ...AUDIO_CONFIG };
        }

        // Force encoding bitrate
        if (options.encodingVoiceBitRate !== undefined) {
            options.encodingVoiceBitRate = MAX_BITRATE;
        }

        // Remove packet loss
        if (options.packetLossRate !== undefined) {
            options.packetLossRate = 0;
        }

        return options;
    },

    start() {
        // Monitor and force settings every time they change
        const originalSetTransportOptions = window.DiscordNative?.nativeModules?.requireModule('discord_voice')?.setTransportOptions;
        
        if (originalSetTransportOptions) {
            window.DiscordNative.nativeModules.requireModule('discord_voice').setTransportOptions = (options) => {
                return originalSetTransportOptions(this.forceAudioQuality(options));
            };
        }

        console.log("[EnhancedAudioQuality] Forced maximum audio quality (510kbps)");
    }
});