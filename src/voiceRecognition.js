/// <reference types="chrome"/>
/* global chrome */
import * as tf from "@tensorflow/tfjs";

// Constants for audio processing
const SAMPLE_RATE = 16000;
const FFT_SIZE = 1024;
const HOP_LENGTH = 512;
const MEL_BINS = 40;
const COMMANDS = [
  "open_tab",
  "close_tab",
  "scroll_up",
  "scroll_down",
  "search_google",
  "stop",
];

class VoiceCommandRecognizer {
  constructor() {
    this.model = null;
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.isListening = false;
    this.bufferSize = 4096;
    this.melSpectrogram = null;
    this.commandCallbacks = {};
    this.lastCommand = null;
    this.commandCooldown = false;
    this.confidenceThreshold = 0.75;
  }

  async initilize() {
    try {
      // Load the model
      this.model = await tf.loadLayersModel(
        chrome.runtime.getURL("models/voice_command_model/model.json")
      );
      console.log("Model loaded successfully");

      // Initialize audio context
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)({
        sampleRate: SAMPLE_RATE,
      });
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = FFT_SIZE;
      this.analyser.smoothingTimeConstant = 0.5;

      return true;
    } catch (error) {
      console.error("Failed to initialize voice command recognizer:", error);
      return false;
    }
  }

  async startListening() {
    if (this.isListening) return;

    try {
      if (!this.audioContext) {
        await this.initilize();
      }

      // Resume audio context if suspended
      if (this.audioContext?.state === "suspended") {
        await this.audioContext.resume();
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);

      // Set up processing node
      const processorNode = this.audioContext.createScriptProcessor(
        this.bufferSize,
        1,
        1
      );
      processorNode.onaudioprocess = this.handleAudioProcess.bind(this);
      this.analyser.connect(processorNode);
      processorNode.connect(this.audioContext.destination);

      this.isListening = true;
      console.log("Voice recognition started");

      return true;
    } catch (error) {
      console.error("Error starting voice recognition:", error);
      return false;
    }
  }

  stopListening() {
    if (!this.isListening) return;

    try {
      if (this.microphone) {
        this.microphone.mediaStream
          .getTracks()
          .forEach((track) => track.stop());
        this.microphone.disconnect();
        this.microphone = null;
      }
      if (this.analyser) {
        this.analyser.disconnect();
      }

      this.isListening = false;
      console.log("Voice recognition stopped");

      return true;
    } catch (error) {
      console.error("Error stopping voice recognition:", error);
      return false;
    }
  }

  handleAudioProcess(audioProcessingEvent) {
    const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);

    // Convert audio data to Mel spectrogram
    const features = this.extractFeatures(inputData);

    // Run inference on the features
    if (features) {
      this.runInference(features);
    }
  }

  extractFeatures() {
    try {
      const frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(frequencyData);

      // Convert tensor format expected by model
      const tensor = tf
        .tensor(Array.from(frequencyData))
        .reshape([1, MEL_BINS, -1, 1])
        .div(255.0);
      return tensor;
    } catch (error) {
      console.error("Error extracting features:", error);
      return null;
    }
  }

  async runInference(features) {
    if (!this.model || this.commandCooldown) return;
    try {
      const prediction = this.model.predict(features);
      const scores = await prediction.data();
      prediction.dispose();
      features.dispose();

      // Command with the highest score
      let maxScore = 0;
      let maxIndex = -1;

      for (let i = 0; i < scores.length; i++) {
        if (scores[i] > maxScore) {
          maxScore = scores[i];
          maxIndex = i;
        }
      }

      // Trigger commands if confidence is above threshold
      if (maxScore >= this.confidenceThreshold) {
        const command = COMMANDS[maxIndex];

        if (this.lastCommand !== command) {
          console.log(
            `Detected command : ${command} with confidence: ${maxScore.toFixed(
              2
            )}`
          );
          this.lastCommand = command;
          this.triggerCommand(command);

          // Cooldown
          this.commandCooldown = true;
          setTimeout(() => {
            this.commandCooldown = false;
          }, 1000);
        }
      }
    } catch (error) {
      console.error("Error running inference:", error);
    }
  }

  triggerCommand(command) {
    // Map voice commands to extension actions
    const commandMapping = {
      open_tab: { command: "NEW_TAB" },
      close_tab: { command: "CLOSE_TAB" },
      scroll_up: { command: "SCROLL_UP", direction: "up" },
      scroll_down: { command: "SCROLL_DOWN", direction: "down" },
      search_google: { command: "NAVIGATE", url: "https://www.google.com/" },
      stop: { command: "STOP_LISTENING" },
    };

    const message = commandMapping[command];

    if (message) {
      if (message.command === "STOP_LISTENING") {
        this.stopListening();
      } else {
        chrome.runtime.sendMessage(message, (response) => {
          console.log("Command executed:", response);
        });
      }
    }

    if (this.commandCallbacks[command]) {
      this.commandCallbacks[command]();
    }
  }

  onCommand(command, callback) {
    this.commandCallbacks[command] = callback;
  }

  setConfidenceThreshold(threshold) {
    if (threshold >= 0 && threshold <= 1) {
      this.confidenceThreshold = threshold;
    }
  }
}

export default new VoiceCommandRecognizer();
