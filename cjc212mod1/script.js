// Global variables
let scenarioData = [];
let currentScenarioIndex = 0;
let userScore = 0;
let speaking = false;
let currentUtterance = null;
let voices = [];
let maxProgress = 0;

// DOM elements
const scenarioTextElement = document.getElementById("scenarioText");
const choicesContainerElement = document.getElementById("choicesContainer");
const playButton = document.getElementById("playButton");
const pauseButton = document.getElementById("pauseButton");
const stopButton = document.getElementById("stopButton");
const progressFill = document.getElementById("progressFill");
const scoreContainer = document.getElementById("scoreContainer");
const scoreValue = document.getElementById("scoreValue");
const scoreMessage = document.getElementById("scoreMessage");
const restartButton = document.getElementById("restartButton");

// Initialize the application
async function initApplication() {
    try {
        // Load scenario data
        const response = await fetch('cjc_212_module_1__ethical_systems_scenarios_self_assessment_activity.json');
        if (!response.ok) {
            throw new Error('Failed to load scenarios.json');
        }
        
        scenarioData = await response.json();
        
        // Calculate max progress (number of scenarios with choices)
        maxProgress = scenarioData.filter(scenario => scenario.choices && scenario.choices.length > 0).length;
        
        // Initialize the game
        initGame();
        
        // Initialize speech synthesis
        initSpeechSynthesis();
        
    } catch (error) {
        console.error('Error initializing application:', error);
        scenarioTextElement.textContent = 'Error loading scenario data. Please refresh the page.';
    }
}

// Initialize speech synthesis
function initSpeechSynthesis() {
    // Check if browser supports speech synthesis
    if ('speechSynthesis' in window) {
        // Get available voices
        speechSynthesis.onvoiceschanged = () => {
            voices = speechSynthesis.getVoices();
        };
        
        // Initial voice loading
        voices = speechSynthesis.getVoices();
    } else {
        alert("Your browser does not support the Web Speech API. Please use a different browser.");
        playButton.disabled = true;
    }
}

// Initialize the game
function initGame() {
    // Reset game state
    currentScenarioIndex = 0;
    userScore = 0;
    updateProgress(0);
    
    // Display first scenario
    displayScenario(currentScenarioIndex);
    
    // Hide score container
    scoreContainer.style.display = "none";
}

// Update progress bar
function updateProgress(progressStep) {
    const percentage = Math.min(100, (progressStep / maxProgress) * 100);
    progressFill.style.width = `${percentage}%`;
}

// Display the current scenario
function displayScenario(index) {
    // Get the scenario
    const scenario = scenarioData[index];
    if (!scenario) {
        console.error("Scenario not found at index:", index);
        return;
    }
    
    // Display scenario text
    scenarioTextElement.textContent = scenario.text;
    
    // Clear previous choices
    choicesContainerElement.innerHTML = "";
    
    // If this is a final scenario (no choices) or the last scenario, show the completion screen
    if (!scenario.choices || scenario.choices.length === 0 || index === scenarioData.length - 1) {
        // Show score container
        scoreContainer.style.display = "block";
        
        // Display score - since we're using the isCorrect property, calculate percentage of correct answers
        const totalQuestions = scenarioData.filter(s => s.choices && s.choices.length > 0).length;
        const scorePercentage = Math.round((userScore / totalQuestions) * 100);
        
        scoreValue.textContent = `${userScore}/${totalQuestions} (${scorePercentage}%)`;
        
        // Display message
        scoreMessage.textContent = scenario.finalMessage || "Simulation complete. Consider the ethical implications of the choices presented.";
        
        // Hide choices
        choicesContainerElement.style.display = "none";
    } else {
        // Display choices
        scenario.choices.forEach((choice, i) => {
            const choiceButton = document.createElement("button");
            choiceButton.classList.add("choice-button");
            choiceButton.textContent = choice.text;
            
            // Add data attributes for navigation and scoring
            choiceButton.dataset.next = choice.next;
            choiceButton.dataset.correct = choice.isCorrect;
            choiceButton.dataset.index = i;
            
            // Add event listener
            choiceButton.addEventListener("click", handleChoiceSelection);
            
            // Add to container
            choicesContainerElement.appendChild(choiceButton);
        });
        
        // Show choices
        choicesContainerElement.style.display = "flex";
    }
}

// Handle choice selection
function handleChoiceSelection(event) {
    const choiceButton = event.target;
    const nextScenario = parseInt(choiceButton.dataset.next);
    const isCorrect = choiceButton.dataset.correct === "true";
    
    // Highlight selected choice
    if (isCorrect) {
        userScore++;
        choiceButton.classList.add("correct-choice");
    } else {
        choiceButton.classList.add("incorrect-choice");
    }
    
    // Disable all choice buttons
    const allButtons = choicesContainerElement.querySelectorAll(".choice-button");
    allButtons.forEach(button => {
        button.disabled = true;
    });
    
    // Highlight correct answer if the selected one was wrong
    if (!isCorrect) {
        allButtons.forEach(button => {
            if (button.dataset.correct === "true") {
                button.classList.add("correct-choice");
            }
        });
    }
    
    // Update progress
    const currentProgress = currentScenarioIndex;
    updateProgress(currentProgress + 1);
    
    // Stop any ongoing speech
    if (speaking) {
        stopSpeech();
    }
    
    // Move to next scenario after a brief delay to show feedback
    setTimeout(() => {
        // Navigate to next scenario
        currentScenarioIndex = nextScenario;
        displayScenario(currentScenarioIndex);
    }, 1000);
}

// Play the scenario text using text-to-speech
function playSpeech() {
    if (!window.speechSynthesis) {
        alert("Text-to-speech is not supported in your browser.");
        return;
    }
    
    if (speaking) {
        return;
    }
    
    speaking = true;
    
    // Show pause and stop buttons
    playButton.style.display = "none";
    pauseButton.style.display = "inline-flex";
    stopButton.style.display = "inline-flex";
    
    // Get current scenario text
    const scenario = scenarioData[currentScenarioIndex];
    const text = scenario.text;
    
    // Create a new utterance
    currentUtterance = new SpeechSynthesisUtterance(text);
    
    // Set voice - try to find a good voice 
    if (voices.length > 0) {
        // Try to use a pleasant voice - prefer native English voices if available
        const preferredVoice = voices.find(v => 
            v.lang === 'en-US' && !v.name.includes('Google')
        ) || voices[0];
        
        currentUtterance.voice = preferredVoice;
    }
    
    // Set speech properties
    currentUtterance.rate = 1.0;
    currentUtterance.pitch = 1.0;
    
    // Add event listeners
    currentUtterance.onend = () => {
        speaking = false;
        currentUtterance = null;
        
        // Reset buttons
        playButton.style.display = "inline-flex";
        pauseButton.style.display = "none";
        stopButton.style.display = "none";
        
        // Remove highlighting
        scenarioTextElement.classList.remove("speaking");
    };
    
    // Highlight the text being spoken
    scenarioTextElement.classList.add("speaking");
    
    // Start speaking
    speechSynthesis.speak(currentUtterance);
}

// Pause speech
function pauseSpeech() {
    if (speaking) {
        speechSynthesis.pause();
        pauseButton.textContent = "▶️ Resume";
        pauseButton.onclick = resumeSpeech;
    }
}

// Resume speech
function resumeSpeech() {
    speechSynthesis.resume();
    pauseButton.textContent = "⏸️ Pause";
    pauseButton.onclick = pauseSpeech;
}

// Stop speech
function stopSpeech() {
    speechSynthesis.cancel();
    speaking = false;
    currentUtterance = null;
    
    // Reset buttons
    playButton.style.display = "inline-flex";
    pauseButton.style.display = "none";
    stopButton.style.display = "none";
    
    // Remove highlighting
    scenarioTextElement.classList.remove("speaking");
}

// Event listeners
playButton.addEventListener("click", playSpeech);
pauseButton.addEventListener("click", pauseSpeech);
stopButton.addEventListener("click", stopSpeech);
restartButton.addEventListener("click", initGame);

// Initialize the application when the page loads
window.addEventListener("DOMContentLoaded", initApplication);
