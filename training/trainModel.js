import * as tf from "@tensorflow/tfjs";
import { losses } from "@tensorflow/tfjs/dist";
// import { pool } from "@tensorflow/tfjs/dist";
import * as fs from "fs";
import * as path from "path";
import process from "process";

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

/**
 * Process audio file and extract features
 * @param {string} filePath Path to audio file
 * @returns {Array|null} Features or null if processing failed
 */

async function processAudioFile(filePath) {
  try {
    return new Array(MEL_BINS * 98).fill(0).map(() => Math.random());
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return null;
  }
}

/**
 * Train the model with the prepared dataset
 * @param {tf.Sequential} model The model to train
 * @param {Object} dataset Training data and labels
 * @returns {tf.History} Training history
 */

async function trainModel(model, dataset) {
  const { trainData, trainLabels, validationData, validationLabels } = dataset;

  console.log("Training model...");
  const startTime = Date.now();

  const history = await model.fit(trainData, trainLabels, {
    epochs: EPOCHS,
    batchSize: BATCH_SIZE,
    validationData: [validationData, validationLabels],
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        console.log(
          `Epoch ${epoch + 1}/${EPOCHS} - Loss: ${logs.loss.toFixed(
            4
          )}, Accuracy: ${logs.acc.toFixed(
            4
          )}, Validation Loss: ${logs.val_loss.toFixed(
            4
          )}, Validation Accuracy: ${logs.val_acc.toFixed(4)}`
        );
      },
    },
  });

  const trainingTime = (Date.now() - startTime) / 1000;
  console.log(`Training complete (${trainingTime.toFixed(2)} seconds)`);

  return history;
}

/**
 * Save the trained model
 * @param {tf.Sequential} model The trained model
 * @param {string} outputDir Directory to save the model
 */

async function saveModel(model, outputDir) {
  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const modelPath = `file://${outputDir}`;
    await model.save(modelPath);
    console.log(`Model saved to ${modelPath}`);

    fs.writeFileSync(
      path.join(outputDir, "commands.json"),
      JSON.stringify(COMMANDS)
    );
  } catch (error) {
    console.error(`Error saving model: ${error}`);
  }
}

/**
 * Random shuffle an array
 * @param {Array} array The array to shuffle
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

async function main() {
  try {
    const model = createModel();
    model.summary();

    const dataDir = process.argv[2] || "./data";
    const outputDir = process.argv[3] || "./models/voice_commands_model";

    const dataset = await loadTrainingData(dataDir);
    console.log("Training data loaded");

    await trainModel(model, dataset);
    await saveModel(model, outputDir);

    // Clean up
    dataset.trainData.dispose();
    dataset.trainLabels.dispose();
    dataset.validationData.dispose();
    dataset.validationLabels.dispose();

    console.log("Training pipeline completed successfully");
  } catch (error) {
    console.error("Error in training pipeline:", error);
  }
}
