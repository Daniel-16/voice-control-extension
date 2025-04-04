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
  model.add(
    tf.layers.conv2d({
      inputShape: [MEL_BINS, 98, 1],
      filters: 32,
      kernelSize: [3, 3],
      strides: [1, 1],
      padding: "same",
      activation: "relu",
    })
  );
  model.add(
    tf.layers.maxPooling2d({
      poolSize: [2, 2],
      strides: [2, 2],
    })
  );

  // Layer 2: Convolutional + Pooling
  model.add(
    tf.layers.conv2d({
      filters: 64,
      kernelSize: [3, 3],
      strides: [1, 1],
      padding: "same",
      activation: "relu",
    })
  );
  model.add(
    tf.layers.maxPooling2d({
      poolSize: [2, 2],
      strides: [2, 2],
    })
  );

  // Layer 3: Convolutional + Pooling
  model.add(
    tf.layers.conv2d({
      filters: 128,
      kernelSize: [3, 3],
      strides: [1, 1],
      padding: "same",
      activation: "relu",
    })
  );
  model.add(
    tf.layers.maxPooling2d({
      poolSize: [2, 2],
      strides: [2, 2],
    })
  );

  // Flatten the output and feed it into a dense layer
  model.add(tf.layers.flatten());
  model.add(tf.layers.dropout({ rate: 0.5 }));

  // Dense layers
  model.add(tf.layers.dense({ units: 256, activation: "relu" }));
  model.add(tf.layers.dropout({ rate: 0.3 }));

  // Output layer
  model.add(
    tf.layers.dense({
      units: COMMANDS.length,
      activation: "softmax",
    })
  );

  // Compile the model
  model.compile({
    optimizer: tf.train.adam(LEARNING_RATE),
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"],
  });

  return model;
}

/**
 * Load and preprocess audio data for training.
 * @param {string} dataDir - Directory containing training data.
 * @returns {Promise<{xTrain: tf.Tensor, yTrain: tf.Tensor}>} - Preprocessed training data.
 */

async function loadTrainingData(dataDir) {
  const dataSet = {
    trainData: [],
    trainLabels: [],
    validationData: [],
    validationLabels: [],
  };

  console.log(`Loading training data from ${dataDir}...`);

  for (let i = 0; i < COMMANDS.length; i++) {
    const command = COMMANDS[i];
    const commandDir = path.join(dataDir, command);

    if (!fs.existsSync(commandDir)) {
      console.warn(`Directory ${commandDir} does not exist. Skipping...`);
      continue;
    }

    const files = fs
      .readFileSync(commandDir)
      .filter((file) => file.endsWith(".wav"));
    console.log(`Loading ${files.length} files for command "${command}"...`);

    // Shuffle files
    shuffleArray(files);

    const splitIndex = Math.floor(files.length * (1 - VALIDATION_SPLIT));
    const trainFiles = files.slice(0, splitIndex);
    const validationFiles = files.slice(splitIndex);

    for (const file of trainFiles) {
      const filePath = path.join(commandDir, file);
      const features = await processAudioFile(filePath);
      if (features) {
        dataSet.trainData.push(features);
        dataSet.trainLabels.push(i);
      }
    }

    for (const file of validationFiles) {
      const filePath = path.join(commandDir, file);
      const features = await processAudioFile(filePath);
      if (features) {
        dataSet.validationData.push(features);
        dataSet.validationLabels.push(i);
      }
    }
  }

  return {
    trainData: tf.tensor4d(dataSet.trainData, [
      dataSet.trainData.length,
      MEL_BINS,
      98,
      1,
    ]),
    trainLabels: tf.oneHot(
      tf.tensor1d(dataSet.trainLabels, "int32"),
      COMMANDS.length
    ),
    validationData: tf.tensor4d(dataSet.validationData, [
      dataSet.validationData.length,
      MEL_BINS,
      98,
      1,
    ]),
    validationLabels: tf.oneHot(
      tf.tensor1d(dataSet.validationLabels, "int32"),
      COMMANDS.length
    ),
  };
}
