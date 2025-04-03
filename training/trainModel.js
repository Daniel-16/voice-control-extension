import * as tf from "@tensorflow/tfjs";
import { losses } from "@tensorflow/tfjs/dist";
// import { pool } from "@tensorflow/tfjs/dist";
import * as fs from "fs";
import * as path from "path";

const SAMPLE_RATE = 16000;
const FFT_SIZE = 1024;
const FRAME_LENGTH = 25;
const FRAME_STEPS = 10;
const MEL_BINS = 40;
const COMMANDS = [
  "open_tab",
  "close_tab",
  "scroll_up",
  "scroll_down",
  "search_google",
  "stop",
  "_background_noise_",
];

const EPOCHS = 50;
const BATCH_SIZE = 32;
const VALIDATION_SPLIT = 0.2;
const LEARNING_RATE = 0.001;

/**
 * Create a Keras model for voice command recognition.
 * @returns {tf.Sequential} The Keras model.
 */

function createModel() {
    const model = tf.sequential();

    // Layer 1: Convolutional layer
    model.add(tf.layers.conv2d({
        inputShape: [MEL_BINS, 98, 1],
        filters: 32,
        kernelSize: [3, 3],
        strides: [1, 1],
        padding: "same",
        activation: "relu",
    }));
    model.add(tf.layers.maxPooling2d({
        poolSize: [2, 2],
        strides: [2, 2],
    }))

    // Layer 2: Convolutional + Pooling
    model.add(tf.layers.conv2d({
        filters: 64,
        kernelSize: [3, 3],
        strides: [1, 1],
        padding: "same",
        activation: "relu",
    }))
    model.add(tf.layers.maxPooling2d({
        poolSize: [2, 2],
        strides: [2, 2],
    }))

    // Layer 3: Convolutional + Pooling
    model.add(tf.layers.conv2d({
        filters: 128,
        kernelSize: [3, 3],
        strides: [1, 1],
        padding: "same",
        activation: "relu",
    }))
    model.add(tf.layers.maxPooling2d({
        poolSize: [2, 2],
        strides: [2, 2],
    }))

    // Flatten the output and feed it into a dense layer
    model.add(tf.layers.flatten());
    model.add(tf.layers.dropout({ rate: 0.5 }));

    // Dense layers
    model.add(tf.layers.dense({ units: 256, activation: "relu" }));
    model.add(tf.layers.dropout({ rate: 0.3 }));

    // Output layer
    model.add(tf.layers.dense({
        units: COMMANDS.length,
        activation: "softmax",
    }))

    // Compile the model
    model.compile({
        optimizer: tf.train.adam(LEARNING_RATE),
        loss: "categoricalCrossentropy",
        metrics: ["accuracy"],
    })

    return model;
}

