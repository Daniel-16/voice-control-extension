# Voice Control Browser Extension

A browser extension that enables voice control functionality for web browsing, allowing users to navigate and interact with web pages using voice commands.

## Features

- **Tab Management**: Open new tabs and close current tabs using voice commands
- **Navigation**: Navigate to specific websites like Google
- **Page Interaction**: Scroll up and down on web pages
- **Accessible Interface**: Simple UI with visual feedback for voice commands
- **Cross-Browser Compatibility**: Works across major browsers that support the WebExtension API

## Architecture

### Frontend (React + Vite)

The extension uses React for the popup UI, built with Vite for fast development and optimized production builds.

- **UI Components**: Simple, responsive interface with button controls for testing commands
- **Status Display**: Visual feedback when commands are executed
- **Message Passing**: Communication with the background script

### Background Script

The background script handles the core extension functionality:

- **Tab Management**: Creating and closing tabs
- **Command Processing**: Handling incoming commands from the popup and voice recognition
- **Content Script Management**: Injecting content scripts into tabs when needed
- **Security**: Handling restricted page access (chrome://, extension://, etc.)

### Content Script

The content script runs in the context of web pages:

- **Page Interaction**: Scrolling and potentially other DOM manipulations
- **Scrollable Element Detection**: Identifying scrollable areas on a page
- **Smooth Animations**: Implementing smooth scrolling behavior

## Voice Recognition

The extension will use a TensorFlow-based model for voice command recognition:

### Model Architecture

- **Input**: Audio waveform processed as mel-spectrograms
- **Architecture**: Convolutional Neural Network (CNN) for feature extraction + Recurrent Neural Network (RNN) layers for sequence processing
- **Output**: Classification of voice commands into predefined actions

### Command Set

The voice model will be trained to recognize these commands:
- "Open tab"
- "Close tab"
- "Search Google"
- "Scroll down"
- "Scroll up"
- Additional commands to be added

### Training Process

1. **Data Collection**: Recording of voice commands in various environments and accents
2. **Preprocessing**: Audio normalization, noise reduction, and feature extraction
3. **Model Training**: Using TensorFlow to train the CNN-RNN architecture
4. **Validation**: Testing with held-out data to ensure command accuracy
5. **Optimization**: Fine-tuning model size and performance for browser extension environment

## Installation

### Development Mode

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/voice-control-extension.git
   cd voice-control-extension
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the extension:
   ```
   npm run build
   ```

4. Load the extension in your browser:
   - Chrome: Navigate to `chrome://extensions/`, enable "Developer mode", click "Load unpacked", and select the `dist` folder
   - Firefox: Navigate to `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on", and select the `manifest.json` file

### Production Installation

- Chrome: [Chrome Web Store Link - Coming Soon]
- Firefox: [Firefox Add-ons Link - Coming Soon]

## Usage

1. Click the extension icon in your browser toolbar to open the popup
2. Click the microphone button to activate voice listening (or use keyboard shortcut)
3. Speak a command clearly
4. The extension will process your command and execute the corresponding action
5. Visual feedback will be displayed to confirm the action was performed

## Technical Details

### Permissions

The extension requires the following permissions:
- `tabs`: For managing browser tabs
- `activeTab`: For interacting with the active tab
- `storage`: For storing user preferences
- `scripting`: For injecting content scripts

### Browser Support

- Chrome (v88+)
- Firefox (v78+)
- Edge (v88+)

## Development

### Project Structure

```
voice-control-extension/
├── public/                  # Static assets
│   ├── icons/               # Extension icons
│   ├── manifest.json        # Extension manifest
│   └── background.js        # Background script entry point
├── src/                     # Source code
│   ├── App.jsx              # Main React component
│   ├── background.js        # Background script implementation
│   ├── content.js           # Content script implementation
│   └── main.jsx             # React entry point
├── model/                   # TensorFlow model files
│   ├── training/            # Model training scripts
│   └── preprocessor/        # Audio preprocessing utilities
└── README.md                # This documentation
```

### Build Commands

- `npm run dev`: Start development server
- `npm run build`: Build production-ready extension
- `npm run lint`: Run ESLint
- `npm run test`: Run tests

## TensorFlow Model Development

### Model Architecture Details

The voice recognition model uses a CNN-LSTM architecture:

- **Input Layer**: Processes mel-spectrogram features (time x frequency)
- **CNN Layers**: Extract spatial features from the audio spectrogram
- **LSTM Layers**: Process the temporal sequence of audio features
- **Dense Layers**: Final classification of commands

### Training Requirements

- TensorFlow 2.x
- Python 3.8+
- Audio datasets with labeled commands
- GPU recommended for faster training

### Model Integration

The trained TensorFlow.js model will be integrated into the extension through the following process:

1. Train model in Python using TensorFlow
2. Convert model to TensorFlow.js format
3. Include the model in the extension package
4. Load the model when the extension starts
5. Process audio input in real-time when voice commands are activated

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/reasonable-feature`)
3. Commit your changes (`git commit -m 'Add some reasonable feature'`)
4. Push to the branch (`git push origin feature/reasonable-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- React and Vite for the frontend framework
- TensorFlow for the voice recognition capabilities
- All contributors who have helped improve this extension