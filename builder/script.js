document.addEventListener('DOMContentLoaded', function() {
    // State management
    const appState = {
        scenarios: [],
        currentScenario: null,
        currentScenarioId: null,
        currentNodeId: null,
        nodes: [],
        connections: [],
        nodeCounter: 0,
        previewState: {
            currentNodeIndex: 0,
            score: 0,
            path: []
        }
    };

    // DOM Elements
    const elements = {
        // Views
        dashboardView: document.getElementById('dashboardView'),
        editorView: document.getElementById('editorView'),
        previewView: document.getElementById('previewView'),
        
        // Dashboard
        scenarioList: document.getElementById('scenarioList'),
        
        // Header buttons
        newScenarioBtn: document.getElementById('newScenarioBtn'),
        importBtn: document.getElementById('importBtn'),
        fileInput: document.getElementById('fileInput'),
        exportBtn: document.getElementById('exportBtn'),
        previewBtn: document.getElementById('previewBtn'),
        
        // Editor
        scenarioTitle: document.getElementById('scenarioTitle'),
        nodeCanvas: document.getElementById('nodeCanvas'),
        addNodeBtn: document.getElementById('addNodeBtn'),
        clearCanvasBtn: document.getElementById('clearCanvasBtn'),
        saveBtn: document.getElementById('saveBtn'),
        backBtn: document.getElementById('backBtn'),
        
        // Node editor
        noNodeSelected: document.getElementById('noNodeSelected'),
        nodeEditor: document.getElementById('nodeEditor'),
        nodeText: document.getElementById('nodeText'),
        choicesContainer: document.getElementById('choicesContainer'),
        addChoiceBtn: document.getElementById('addChoiceBtn'),
        isEndingNode: document.getElementById('isEndingNode'),
        finalMessage: document.getElementById('finalMessage'),
        finalMessageContainer: document.getElementById('finalMessageContainer'),
        updateNodeBtn: document.getElementById('updateNodeBtn'),
        deleteNodeBtn: document.getElementById('deleteNodeBtn'),
        
        // Preview
        previewText: document.getElementById('previewText'),
        previewChoices: document.getElementById('previewChoices'),
        previewProgress: document.getElementById('previewProgress'),
        exitPreviewBtn: document.getElementById('exitPreviewBtn'),
        restartPreviewBtn: document.getElementById('restartPreviewBtn'),
        
        // Validation
        validationMessage: document.getElementById('validationMessage'),
        
        // Templates
        choiceTemplate: document.getElementById('choiceTemplate'),
        nodeTemplate: document.getElementById('nodeTemplate'),
        scenarioItemTemplate: document.getElementById('scenarioItemTemplate')
    };

    // Initialize the application
    function init() {
        loadScenariosFromLocalStorage();
        renderScenarioList();
        attachEventListeners();
    }

    // Load saved scenarios from localStorage
    function loadScenariosFromLocalStorage() {
        const savedScenarios = localStorage.getItem('ethicalScenarios');
        if (savedScenarios) {
            appState.scenarios = JSON.parse(savedScenarios);
        }
    }

    // Save scenarios to localStorage
    function saveScenariosToLocalStorage() {
        localStorage.setItem('ethicalScenarios', JSON.stringify(appState.scenarios));
    }

    // Attach event listeners
    function attachEventListeners() {
        // Header buttons
        elements.newScenarioBtn.addEventListener('click', createNewScenario);
        elements.importBtn.addEventListener('click', () => elements.fileInput.click());
        elements.fileInput.addEventListener('change', handleFileImport);
        elements.exportBtn.addEventListener('click', exportScenario);
        elements.previewBtn.addEventListener('click', startPreview);
        
        // Editor buttons
        elements.addNodeBtn.addEventListener('click', addNewNode);
        elements.clearCanvasBtn.addEventListener('click', clearCanvas);
        elements.saveBtn.addEventListener('click', saveScenario);
        elements.backBtn.addEventListener('click', returnToDashboard);
        
        // Node editor
        elements.addChoiceBtn.addEventListener('click', addNewChoice);
        elements.updateNodeBtn.addEventListener('click', updateNodeContent);
        elements.deleteNodeBtn.addEventListener('click', deleteCurrentNode);
        elements.isEndingNode.addEventListener('change', toggleEndingNodeState);
        
        // Preview
        elements.exitPreviewBtn.addEventListener('click', exitPreview);
        elements.restartPreviewBtn.addEventListener('click', restartPreview);
    }

    // Switch between views
    function showView(viewName) {
        elements.dashboardView.style.display = 'none';
        elements.editorView.style.display = 'none';
        elements.previewView.style.display = 'none';
        
        if (viewName === 'dashboard') {
            elements.dashboardView.style.display = 'block';
        } else if (viewName === 'editor') {
            elements.editorView.style.display = 'block';
        } else if (viewName === 'preview') {
            elements.previewView.style.display = 'block';
        }
    }

    // Render the list of scenarios
    function renderScenarioList() {
        elements.scenarioList.innerHTML = '';
        
        if (appState.scenarios.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = '<p>No scenarios yet. Create a new one to get started!</p>';
            elements.scenarioList.appendChild(emptyState);
            return;
        }
        
        appState.scenarios.forEach((scenario, index) => {
            const scenarioItem = elements.scenarioItemTemplate.content.cloneNode(true);
            
            // Set title and stats
            scenarioItem.querySelector('.scenario-item-title').textContent = scenario.title;
            
            // Calculate stats
            const nodeCount = scenario.nodes.length;
            const choiceCount = scenario.nodes.reduce((acc, node) => {
                return acc + (node.choices ? node.choices.length : 0);
            }, 0);
            
            scenarioItem.querySelector('.scenario-item-stats').textContent = 
                `${nodeCount} nodes • ${choiceCount} choices`;
            
            // Add event listeners to buttons
            scenarioItem.querySelector('.edit-scenario-btn').addEventListener('click', () => {
                loadScenarioIntoEditor(index);
            });
            
            scenarioItem.querySelector('.duplicate-scenario-btn').addEventListener('click', () => {
                duplicateScenario(index);
            });
            
            scenarioItem.querySelector('.delete-scenario-btn').addEventListener('click', () => {
                deleteScenario(index);
            });
            
            elements.scenarioList.appendChild(scenarioItem);
        });
    }

    // Create a new scenario
    function createNewScenario() {
        appState.currentScenario = {
            title: 'Untitled Scenario',
            nodes: [],
            connections: []
        };
        
        appState.currentScenarioId = null;
        appState.nodes = [];
        appState.connections = [];
        appState.nodeCounter = 0;
        appState.currentNodeId = null;
        
        elements.scenarioTitle.value = appState.currentScenario.title;
        clearCanvas();
        showView('editor');
        showNodeEditor(false);
    }

    // Add a new node to the canvas
    function addNewNode() {
        const nodeId = appState.nodeCounter++;
        const node = {
            id: nodeId,
            text: 'New scenario node',
            choices: [],
            isEnding: false,
            finalMessage: '',
            position: {
                x: 50 + (appState.nodes.length * 30) % 300,
                y: 50 + Math.floor(appState.nodes.length / 10) * 120
            }
        };
        
        appState.nodes.push(node);
        renderNode(node);
        selectNode(nodeId);
    }

    // Render a node on the canvas
    function renderNode(node) {
        // Check if node already exists on canvas
        let nodeElement = document.getElementById(`node-${node.id}`);
        
        if (!nodeElement) {
            // Create new node element
            const nodeTemplate = elements.nodeTemplate.content.cloneNode(true);
            nodeElement = nodeTemplate.querySelector('.node');
            nodeElement.id = `node-${node.id}`;
            nodeElement.dataset.nodeId = node.id;
            
            // Make node draggable
            nodeElement.addEventListener('mousedown', startDragNode);
            
            // Select node on click
            nodeElement.addEventListener('click', (e) => {
                e.stopPropagation();
                selectNode(node.id);
            });
            
            elements.nodeCanvas.appendChild(nodeElement);
        }
        
        // Update node content
        nodeElement.querySelector('.node-id').textContent = `Node ${node.id}`;
        nodeElement.querySelector('.node-content').textContent = node.text.substring(0, 100) + 
            (node.text.length > 100 ? '...' : '');
        
        // Set node type
        if (node.isEnding) {
            nodeElement.classList.add('ending-node');
            nodeElement.querySelector('.node-type').textContent = 'Ending';
        } else {
            nodeElement.classList.remove('ending-node');
            nodeElement.querySelector('.node-type').textContent = 
                `${node.choices.length} choice${node.choices.length !== 1 ? 's' : ''}`;
        }
        
        // Position node
        nodeElement.style.left = `${node.position.x}px`;
        nodeElement.style.top = `${node.position.y}px`;
        
        // Draw connections
        drawConnections();
    }

    // Make nodes draggable
    function startDragNode(e) {
        const nodeElement = e.currentTarget;
        const nodeId = parseInt(nodeElement.dataset.nodeId);
        
        // Select this node
        selectNode(nodeId);
        
        // Calculate the initial mouse position and node offset
        const initialX = e.clientX;
        const initialY = e.clientY;
        
        const nodeRect = nodeElement.getBoundingClientRect();
        const canvasRect = elements.nodeCanvas.getBoundingClientRect();
        
        const offsetX = initialX - nodeRect.left;
        const offsetY = initialY - nodeRect.top;
        
        // Set up event handlers for dragging
        function handleMouseMove(e) {
            const newX = e.clientX - offsetX - canvasRect.left + elements.nodeCanvas.scrollLeft;
            const newY = e.clientY - offsetY - canvasRect.top + elements.nodeCanvas.scrollTop;
            
            // Update node position in DOM
            nodeElement.style.left = `${newX}px`;
            nodeElement.style.top = `${newY}px`;
            
            // Update node position in state
            const nodeIndex = appState.nodes.findIndex(n => n.id === nodeId);
            if (nodeIndex !== -1) {
                appState.nodes[nodeIndex].position.x = newX;
                appState.nodes[nodeIndex].position.y = newY;
            }
            
            // Redraw connections
            drawConnections();
        }
        
        function handleMouseUp() {
            // Remove event listeners
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }
        
        // Add event listeners for dragging
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        // Prevent default behavior
        e.preventDefault();
    }

    // Draw connections between nodes
    function drawConnections() {
        // Remove existing connections
        elements.nodeCanvas.querySelectorAll('.connection-line').forEach(line => line.remove());
        
        // Draw new connections
        appState.nodes.forEach(sourceNode => {
            if (!sourceNode.choices) return;
            
            sourceNode.choices.forEach(choice => {
                if (choice.next === undefined) return;
                
                const targetNode = appState.nodes.find(n => n.id === choice.next);
                if (!targetNode) return;
                
                drawConnection(sourceNode, targetNode, choice.isCorrect);
            });
        });
    }

    // Draw a single connection between two nodes
    function drawConnection(sourceNode, targetNode, isCorrect) {
        const sourceElement = document.getElementById(`node-${sourceNode.id}`);
        const targetElement = document.getElementById(`node-${targetNode.id}`);
        
        if (!sourceElement || !targetElement) return;
        
        // Calculate source and target positions
        const sourceRect = sourceElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        const canvasRect = elements.nodeCanvas.getBoundingClientRect();
        
        // Calculate center points
        const sourceX = sourceNode.position.x + sourceElement.offsetWidth / 2;
        const sourceY = sourceNode.position.y + sourceElement.offsetHeight;
        const targetX = targetNode.position.x + targetElement.offsetWidth / 2;
        const targetY = targetNode.position.y;
        
        // Create line element
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        line.classList.add('connection-line');
        line.style.position = 'absolute';
        line.style.zIndex = '-1';
        line.style.overflow = 'visible';
        
        // Position and size the SVG
        const minX = Math.min(sourceX, targetX) - 10;
        const minY = Math.min(sourceY, targetY) - 10;
        const width = Math.abs(targetX - sourceX) + 20;
        const height = Math.abs(targetY - sourceY) + 20;
        
        line.style.left = `${minX}px`;
        line.style.top = `${minY}px`;
        line.style.width = `${width}px`;
        line.style.height = `${height}px`;
        line.setAttribute('viewBox', `0 0 ${width} ${height}`);
        
        // Create path element
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        // Calculate path coordinates
        const startX = sourceX - minX;
        const startY = sourceY - minY;
        const endX = targetX - minX;
        const endY = targetY - minY;
        
        // Create curved path
        const controlPointX1 = startX;
        const controlPointY1 = startY + (endY - startY) * 0.5;
        const controlPointX2 = endX;
        const controlPointY2 = startY + (endY - startY) * 0.5;
        
        path.setAttribute('d', 
            `M ${startX} ${startY} ` +
            `C ${controlPointX1} ${controlPointY1}, ${controlPointX2} ${controlPointY2}, ${endX} ${endY}`
        );
        
        // Style the path
        path.setAttribute('stroke', isCorrect ? '#27ae60' : '#3498db');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        path.setAttribute('marker-end', 'url(#arrowhead)');
        
        // Create arrow marker
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('refX', '10');
        marker.setAttribute('refY', '3.5');
        marker.setAttribute('orient', 'auto');
        
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
        polygon.setAttribute('fill', isCorrect ? '#27ae60' : '#3498db');
        
        marker.appendChild(polygon);
        defs.appendChild(marker);
        
        // Add elements to SVG
        line.appendChild(defs);
        line.appendChild(path);
        
        // Add SVG to canvas
        elements.nodeCanvas.appendChild(line);
    }

    // Select a node for editing
    function selectNode(nodeId) {
        // Deselect current node if any
        const currentSelectedNode = elements.nodeCanvas.querySelector('.node.selected');
        if (currentSelectedNode) {
            currentSelectedNode.classList.remove('selected');
        }
        
        // Find the node element and select it
        const nodeElement = document.getElementById(`node-${nodeId}`);
        if (nodeElement) {
            nodeElement.classList.add('selected');
        }
        
        // Update state
        appState.currentNodeId = nodeId;
        
        // Show node editor
        showNodeEditor(true);
        populateNodeEditor();
    }

    // Show or hide node editor
    function showNodeEditor(show) {
        elements.noNodeSelected.style.display = show ? 'none' : 'block';
        elements.nodeEditor.style.display = show ? 'block' : 'none';
    }

    // Populate node editor with selected node data
    function populateNodeEditor() {
        const node = appState.nodes.find(n => n.id === appState.currentNodeId);
        if (!node) return;
        
        // Set node text
        elements.nodeText.value = node.text;
        
        // Set ending node state
        elements.isEndingNode.checked = node.isEnding;
        elements.finalMessageContainer.style.display = node.isEnding ? 'block' : 'none';
        elements.finalMessage.value = node.finalMessage || '';
        
        // Clear existing choices
        elements.choicesContainer.innerHTML = '';
        
        // Add choices
        if (node.choices) {
            node.choices.forEach(choice => {
                addChoiceToEditor(choice);
            });
        }
        
        // Update node editor state based on ending status
        updateNodeEditorState();
    }

    // Toggle node type (ending or normal)
    function toggleEndingNodeState() {
        updateNodeEditorState();
    }

    // Update node editor state based on ending checkbox
    function updateNodeEditorState() {
        const isEnding = elements.isEndingNode.checked;
        
        // Show/hide choices section
        elements.addChoiceBtn.parentElement.parentElement.style.display = isEnding ? 'none' : 'block';
        
        // Show/hide final message
        elements.finalMessageContainer.style.display = isEnding ? 'block' : 'none';
    }

    // Add a new choice to the editor
    function addNewChoice() {
        addChoiceToEditor({
            text: '',
            next: null,
            isCorrect: false
        });
    }

    // Add a choice to the editor
    function addChoiceToEditor(choice) {
        const choiceElement = elements.choiceTemplate.content.cloneNode(true);
        
        // Set choice text
        choiceElement.querySelector('.choice-text').value = choice.text;
        
        // Set choice properties
        choiceElement.querySelector('.is-correct-checkbox').checked = choice.isCorrect;
        
        // Populate next node dropdown
        const selectElement = choiceElement.querySelector('.next-node-select');
        populateNodeSelect(selectElement, choice.next);
        
        // Add remove button event listener
        choiceElement.querySelector('.remove-choice-btn').addEventListener('click', function() {
            this.closest('.choice-item').remove();
        });
        
        elements.choicesContainer.appendChild(choiceElement);
    }

    // Populate node selection dropdown
    function populateNodeSelect(selectElement, selectedNodeId) {
        // Clear existing options
        selectElement.innerHTML = '';
        
        // Add blank option
        const blankOption = document.createElement('option');
        blankOption.value = '';
        blankOption.textContent = '-- Select Node --';
        selectElement.appendChild(blankOption);
        
        // Add options for each node except the current one
        appState.nodes.forEach(node => {
            if (node.id !== appState.currentNodeId) {
                const option = document.createElement('option');
                option.value = node.id;
                option.textContent = `Node ${node.id}: ${node.text.substring(0, 30)}${node.text.length > 30 ? '...' : ''}`;
                option.selected = node.id === selectedNodeId;
                selectElement.appendChild(option);
            }
        });
    }

    // Update node content from editor
    function updateNodeContent() {
        const nodeIndex = appState.nodes.findIndex(n => n.id === appState.currentNodeId);
        if (nodeIndex === -1) return;
        
        // Get node data from form
        const nodeText = elements.nodeText.value.trim();
        const isEnding = elements.isEndingNode.checked;
        const finalMessage = elements.finalMessage.value.trim();
        
        // Validate input
        if (nodeText === '') {
            showValidationMessage('Node text cannot be empty');
            return;
        }
        
        // Update node
        appState.nodes[nodeIndex].text = nodeText;
        appState.nodes[nodeIndex].isEnding = isEnding;
        appState.nodes[nodeIndex].finalMessage = finalMessage;
        
        // Handle choices if not an ending node
        if (!isEnding) {
            const choices = [];
            const choiceElements = elements.choicesContainer.querySelectorAll('.choice-item');
            
            choiceElements.forEach(choiceElement => {
                const choiceText = choiceElement.querySelector('.choice-text').value.trim();
                const nextNode = choiceElement.querySelector('.next-node-select').value;
                const isCorrect = choiceElement.querySelector('.is-correct-checkbox').checked;
                
                if (choiceText !== '' && nextNode !== '') {
                    choices.push({
                        text: choiceText,
                        next: parseInt(nextNode),
                        isCorrect: isCorrect
                    });
                }
            });
            
            appState.nodes[nodeIndex].choices = choices;
        } else {
            appState.nodes[nodeIndex].choices = [];
        }
        
        // Update node on canvas
        renderNode(appState.nodes[nodeIndex]);
        
        // Show success message
        showValidationMessage('Node updated successfully', true);
    }

    // Delete the current node
    function deleteCurrentNode() {
        if (!appState.currentNodeId) return;
        
        // Remove node from state
        appState.nodes = appState.nodes.filter(n => n.id !== appState.currentNodeId);
        
        // Remove references to this node in choices
        appState.nodes.forEach(node => {
            if (node.choices) {
                node.choices = node.choices.filter(choice => choice.next !== appState.currentNodeId);
            }
        });
        
        // Remove node from DOM
        const nodeElement = document.getElementById(`node-${appState.currentNodeId}`);
        if (nodeElement) {
            nodeElement.remove();
        }
        
        // Reset current node
        appState.currentNodeId = null;
        
        // Hide node editor
        showNodeEditor(false);
        
        // Redraw connections
        drawConnections();
    }

    // Clear the canvas
    function clearCanvas() {
        // Clear state
        appState.nodes = [];
        appState.connections = [];
        appState.nodeCounter = 0;
        appState.currentNodeId = null;
        
        // Clear DOM
        elements.nodeCanvas.innerHTML = '';
        
        // Hide node editor
        showNodeEditor(false);
    }

    // Save the current scenario
    function saveScenario() {
        // Validate scenario
        if (appState.nodes.length === 0) {
            showValidationMessage('Scenario must have at least one node');
            return;
        }
        
        // Create scenario object
        appState.currentScenario.title = elements.scenarioTitle.value.trim() || 'Untitled Scenario';
        appState.currentScenario.nodes = appState.nodes;
        
        // Save to list of scenarios
        if (appState.currentScenarioId !== null) {
            appState.scenarios[appState.currentScenarioId] = appState.currentScenario;
        } else {
            appState.scenarios.push(appState.currentScenario);
        }
        
        // Save to localStorage
        saveScenariosToLocalStorage();
        
        // Show success message
        showValidationMessage('Scenario saved successfully', true);
        
        // Return to dashboard
        returnToDashboard();
    }

    // Return to dashboard
    function returnToDashboard() {
        renderScenarioList();
        showView('dashboard');
    }

    // Show validation message
    function showValidationMessage(message, isSuccess = false) {
        const validationElement = elements.validationMessage;
        validationElement.textContent = message;
        validationElement.style.backgroundColor = isSuccess ? '#27ae60' : '#e74c3c';
        validationElement.classList.add('visible');
        
        // Hide after a timeout
        setTimeout(() => {
            validationElement.classList.remove('visible');
        }, 3000);
    }

    // Load a scenario into the editor
    function loadScenarioIntoEditor(scenarioIndex) {
        const scenario = appState.scenarios[scenarioIndex];
        
        // Set current scenario
        appState.currentScenario = JSON.parse(JSON.stringify(scenario));
        appState.currentScenarioId = scenarioIndex;
        
        // Load nodes
        appState.nodes = JSON.parse(JSON.stringify(scenario.nodes));
        
        // Find highest node ID for counter
        const maxNodeId = Math.max(...appState.nodes.map(node => node.id), -1);
        appState.nodeCounter = maxNodeId + 1;
        
        // Reset current node
        appState.currentNodeId = null;
        
        // Update UI
        elements.scenarioTitle.value = scenario.title;
        elements.nodeCanvas.innerHTML = '';
        
        // Render nodes
        appState.nodes.forEach(node => {
            renderNode(node);
        });
        
        // Show editor view
        showView('editor');
        showNodeEditor(false);
    }

    // Duplicate a scenario
    function duplicateScenario(scenarioIndex) {
        const scenario = appState.scenarios[scenarioIndex];
        
        // Create a copy
        const duplicatedScenario = JSON.parse(JSON.stringify(scenario));
        duplicatedScenario.title += ' (Copy)';
        
        // Add to scenarios
        appState.scenarios.push(duplicatedScenario);
        
        // Save to localStorage
        saveScenariosToLocalStorage();
        
        // Update UI
        renderScenarioList();
    }

    // Delete a scenario
    function deleteScenario(scenarioIndex) {
        // Confirm deletion
        if (confirm('Are you sure you want to delete this scenario?')) {
            // Remove from array
            appState.scenarios.splice(scenarioIndex, 1);
            
            // Save to localStorage
            saveScenariosToLocalStorage();
            
            // Update UI
            renderScenarioList();
        }
    }

    // Export scenario as JSON
    function exportScenario() {
        // If we're in the editor, save current changes
        if (elements.editorView.style.display === 'block') {
            saveScenario();
        }
        
        // Get scenario to export
        let scenarioToExport;
        
        if (appState.currentScenarioId !== null) {
            scenarioToExport = appState.scenarios[appState.currentScenarioId];
        } else if (appState.scenarios.length > 0) {
            // If no scenario is currently being edited, show a selection dialog
            const scenarioIndex = 0; // For simplicity, just export the first one
            scenarioToExport = appState.scenarios[scenarioIndex];
        } else {
            showValidationMessage('No scenarios to export');
            return;
        }
        
        // Convert to the expected format
        const exportData = convertToExportFormat(scenarioToExport);
        
        // Create download link
        const filename = scenarioToExport.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.json';
        const jsonStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create and click download link
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Convert scenario to the export format
    function convertToExportFormat(scenario) {
        // Sort nodes by id to ensure the first one is the entry point
        const sortedNodes = [...scenario.nodes].sort((a, b) => a.id - b.id);
        
        // Convert to array format
        return sortedNodes.map(node => {
            const exportNode = {
                text: node.text,
                choices: []
            };
            
            // Add choices if this is not an ending node
            if (!node.isEnding && node.choices && node.choices.length > 0) {
                exportNode.choices = node.choices.map(choice => ({
                    text: choice.text,
                    next: choice.next,
                    isCorrect: choice.isCorrect
                }));
            }
            
            // Add final message for ending nodes
            if (node.isEnding && node.finalMessage) {
                exportNode.finalMessage = node.finalMessage;
            }
            
            return exportNode;
        });
    }

    // Handle file import
    function handleFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Validate imported data
                if (!Array.isArray(importedData)) {
                    throw new Error('Invalid JSON format. Expected an array.');
                }
                
                // Convert imported data to scenario format
                const importedScenario = convertFromImportFormat(importedData);
                
                // Add to scenarios
                appState.scenarios.push(importedScenario);
                
                // Save to localStorage
                saveScenariosToLocalStorage();
                
                // Update UI
                renderScenarioList();
                
                // Show success message
                showValidationMessage('Scenario imported successfully', true);
                
            } catch (error) {
                showValidationMessage('Failed to import: ' + error.message);
            }
        };
        
        reader.readAsText(file);
        
        // Reset the file input
        e.target.value = '';
    }

    // Convert from import format to scenario format
    function convertFromImportFormat(importedData) {
        // Create base scenario
        const scenario = {
            title: 'Imported Scenario',
            nodes: []
        };
        
        // Convert nodes
        importedData.forEach((node, index) => {
            scenario.nodes.push({
                id: index,
                text: node.text,
                choices: node.choices ? node.choices.map(choice => ({
                    text: choice.text,
                    next: choice.next,
                    isCorrect: choice.isCorrect === true
                })) : [],
                isEnding: !node.choices || node.choices.length === 0,
                finalMessage: node.finalMessage || '',
                position: {
                    x: 50 + (index * 30) % 300,
                    y: 50 + Math.floor(index / 10) * 120
                }
            });
        });
        
        return scenario;
    }

    // Start preview mode
    function startPreview() {
        // Check if we have a current scenario
        let previewScenario;
        
        if (elements.editorView.style.display === 'block') {
            // If in editor, use current unsaved scenario
            previewScenario = {
                nodes: appState.nodes
            };
        } else if (appState.scenarios.length > 0) {
            // Otherwise use the first scenario
            previewScenario = appState.scenarios[0];
        } else {
            showValidationMessage('No scenario to preview');
            return;
        }
        
        // Convert to export format
        const previewData = convertToExportFormat(previewScenario);
        
        // Initialize preview state
        appState.previewState = {
            data: previewData,
            currentNodeIndex: 0,
            score: 0,
            path: [],
            maxProgress: previewData.filter(node => node.choices && node.choices.length > 0).length
        };
        
        // Show preview view
        showView('preview');
        
        // Start preview from first node
        renderPreviewNode(0);
    }

    // Render a node in preview mode
    function renderPreviewNode(nodeIndex) {
        const node = appState.previewState.data[nodeIndex];
        
        // Update progress
        const currentPath = appState.previewState.path.length;
        const maxProgress = appState.previewState.maxProgress;
        const progressPercentage = Math.min(100, (currentPath / maxProgress) * 100);
        elements.previewProgress.style.width = `${progressPercentage}%`;
        
        // Update text
        elements.previewText.textContent = node.text;
        
        // Clear choices
        elements.previewChoices.innerHTML = '';
        
        // If this is an ending node or has no choices
        if (!node.choices || node.choices.length === 0) {
            // Show final message if available
            if (node.finalMessage) {
                const finalMessage = document.createElement('div');
                finalMessage.className = 'final-message';
                finalMessage.textContent = node.finalMessage;
                elements.previewChoices.appendChild(finalMessage);
            }
            
            // Show score
            const scorePercent = Math.round((appState.previewState.score / appState.previewState.path.length) * 100);
            const scoreDisplay = document.createElement('div');
            scoreDisplay.className = 'score-value';
            scoreDisplay.textContent = `Score: ${appState.previewState.score}/${appState.previewState.path.length} (${scorePercent}%)`;
            elements.previewChoices.appendChild(scoreDisplay);
            
            // Show restart button
            elements.restartPreviewBtn.style.display = 'block';
            
        } else {
            // Add choices
            node.choices.forEach((choice, i) => {
                const choiceButton = document.createElement('button');
                choiceButton.className = 'choice-button';
                choiceButton.textContent = choice.text;
                
                choiceButton.addEventListener('click', () => {
                    // Track if this was a correct choice
                    if (choice.isCorrect) {
                        appState.previewState.score++;
                        choiceButton.classList.add('correct-choice');
                    } else {
                        choiceButton.classList.add('incorrect-choice');
                    }
                    
                    // Add to path
                    appState.previewState.path.push({
                        nodeIndex: nodeIndex,
                        choiceIndex: i,
                        wasCorrect: choice.isCorrect
                    });
                    
                    // Disable all buttons
                    elements.previewChoices.querySelectorAll('button').forEach(btn => {
                        btn.disabled = true;
                    });
                    
                    // Highlight correct answer if the selected one was wrong
                    if (!choice.isCorrect) {
                        elements.previewChoices.querySelectorAll('button').forEach((btn, index) => {
                            if (node.choices[index].isCorrect) {
                                btn.classList.add('correct-choice');
                            }
                        });
                    }
                    
                    // Move to next node after a delay
                    setTimeout(() => {
                        renderPreviewNode(choice.next);
                    }, 1000);
                });
                
                elements.previewChoices.appendChild(choiceButton);
            });
            
            // Hide restart button
            elements.restartPreviewBtn.style.display = 'none';
        }
    }

    // Exit preview mode
    function exitPreview() {
        // Return to previous view
        if (appState.currentScenarioId !== null || appState.nodes.length > 0) {
            showView('editor');
        } else {
            showView('dashboard');
        }
    }

    // Restart preview
    function restartPreview() {
        // Reset preview state
        appState.previewState.currentNodeIndex = 0;
        appState.previewState.score = 0;
        appState.previewState.path = [];
        
        // Start from first node
        renderPreviewNode(0);
    }

    // Initialize the application
    init();
});
