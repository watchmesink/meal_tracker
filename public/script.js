let elements = {};

// State
let selectedPhotos = [];
let currentView = 'today';

// Utility Functions
function showMessage(message, type = 'success') {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;
    
    elements.messageContainer.appendChild(messageEl);
    
    setTimeout(() => {
        messageEl.remove();
    }, 4000);
}

function showLoading(show = true) {
    elements.loadingIndicator.classList.toggle('hidden', !show);
}

function formatNumber(num) {
    return Math.round(num * 10) / 10;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

function updateSubmitButton() {
    const hasDescription = elements.mealDescription && elements.mealDescription.value.trim().length > 0;
    const hasPhotos = selectedPhotos.length > 0;
    if (elements.sendMealBtn) elements.sendMealBtn.disabled = !(hasDescription || hasPhotos);
    
    // Hide the breakdown when user starts creating a new meal
    if ((hasDescription || hasPhotos) && elements.aiBreakdownContainer) {
        elements.aiBreakdownContainer.classList.add('hidden');
        elements.aiBreakdownContainer.innerHTML = '';
    }
}

// Photo handling functions
function addPhotoPreview(file) {
    const previewItem = document.createElement('div');
    previewItem.className = 'photo-preview-item';
    
    const img = document.createElement('img');
    const reader = new FileReader();
    
    reader.onload = (e) => {
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'photo-remove-btn';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.onclick = () => removePhoto(file, previewItem);
    
    previewItem.appendChild(img);
    previewItem.appendChild(removeBtn);
    elements.photoPreviewContainer.appendChild(previewItem);
    
    selectedPhotos.push(file);
    updateSubmitButton();
}

function removePhoto(file, previewElement) {
    const index = selectedPhotos.indexOf(file);
    if (index > -1) {
        selectedPhotos.splice(index, 1);
    }
    previewElement.remove();
    updateSubmitButton();
}

function clearPhotos() {
    selectedPhotos = [];
    elements.photoPreviewContainer.innerHTML = '';
    updateSubmitButton();
}

function handlePhotoInput() {
    const files = Array.from(elements.photoInput.files);
    
    files.forEach(file => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            showMessage(`${file.name} is not a valid image file`, 'error');
            return;
        }
        
        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            showMessage(`${file.name} is too large (max 10MB)`, 'error');
            return;
        }
        
        // Check if photo already added
        if (selectedPhotos.some(photo => photo.name === file.name && photo.size === file.size)) {
            showMessage(`${file.name} is already added`, 'error');
            return;
        }
        
        addPhotoPreview(file);
    });
    
    // Clear input to allow re-selecting same files
    elements.photoInput.value = '';
}

// Camera function (disabled for now)
// function openCamera() {
//     const input = document.createElement('input');
//     input.type = 'file';
//     input.accept = 'image/*';
//     input.capture = 'environment';
//     input.onchange = (e) => {
//         const file = e.target.files[0];
//         if (file) {
//             addPhotoPreview(file);
//         }
//     };
//     input.click();
// }

// Mobile photo upload functionality - drag and drop removed for mobile optimization

// API Functions
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Handle CSV export
        if (response.headers.get('content-type')?.includes('text/csv')) {
            return response.blob();
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

async function addMeal(description, photos = []) {
    const formData = new FormData();
    
    if (description) {
        formData.append('description', description);
    }
    
    photos.forEach((photo, index) => {
        formData.append('photos', photo);
    });
    
    return await apiRequest('/api/meals/unified', {
        method: 'POST',
        body: formData,
        headers: {} // Remove content-type to let browser set it for FormData
    });
}

async function getTodaysMeals() {
    return await apiRequest('/api/meals/today');
}

async function getHistory() {
    return await apiRequest('/api/history');
}

async function getMealsForDate(date) {
    return await apiRequest(`/api/meals/${date}`);
}

async function deleteMeal(mealId) {
    return await apiRequest(`/api/meals/${mealId}`, {
        method: 'DELETE'
    });
}

async function recalculateMeal(mealId, newPrompt) {
    return await apiRequest(`/api/meals/${mealId}/recalculate`, {
        method: 'POST',
        body: JSON.stringify({ newPrompt }),
        headers: {
            'Content-Type': 'application/json'
        }
    });
}

async function exportCSV() {
    const response = await fetch('/api/export/meals-csv');
    if (!response.ok) throw new Error('Failed to fetch CSV');
    const csv = await response.text();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meals_history.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

async function clearHistory() {
    return await apiRequest(`/api/history`, {
        method: 'DELETE'
    });
}

// UI Functions
function updateTodaysTotals(data) {
    lastTotalsData = data;
    const goals = JSON.parse(localStorage.getItem('nutritionGoals') || '{}');
    function pct(val, goal) {
        if (!goal || goal <= 0) return 0;
        return Math.round((val/goal)*100);
    }
    // Set values
    elements.totalCalories.textContent = data.totals.total_calories;
    elements.totalProtein.textContent = data.totals.total_protein + 'g';
    elements.totalFat.textContent = data.totals.total_fat + 'g';
    elements.totalCarbs.textContent = data.totals.total_carbs + 'g';
    elements.totalFiber.textContent = data.totals.total_fiber + 'g';
    // Set progress bars and percent labels
    const progressData = [
        {val: data.totals.total_calories, goal: goals.calories, bar: 'progress-calories', percent: 'percent-calories'},
        {val: data.totals.total_protein, goal: goals.protein, bar: 'progress-protein', percent: 'percent-protein'},
        {val: data.totals.total_fat, goal: goals.fat, bar: 'progress-fat', percent: 'percent-fat'},
        {val: data.totals.total_carbs, goal: goals.carbs, bar: 'progress-carbs', percent: 'percent-carbs'},
        {val: data.totals.total_fiber, goal: goals.fiber, bar: 'progress-fiber', percent: 'percent-fiber'}
    ];
    progressData.forEach(({val, goal, bar, percent}) => {
        const percentVal = pct(val, goal);
        const barEl = document.getElementById(bar);
        const percentEl = document.getElementById(percent);
        if (barEl) barEl.style.width = Math.min(percentVal, 100) + '%';
        if (percentEl) percentEl.textContent = (goal && goal > 0) ? percentVal + '% completed' : '0% completed';
    });
}

function createMealElement(meal) {
    const mealEl = document.createElement('div');
    mealEl.className = 'meal-item';
    mealEl.dataset.mealId = meal.id;

    // Helper to render view mode
    function renderView() {
        let imagesHtml = '';
        if (meal.image_paths && meal.image_paths.length > 0) {
            imagesHtml = `
                <div class="meal-images">
                    ${meal.image_paths.map(path => `<img src="/${path}" alt="Meal photo" class="meal-image">`).join('')}
                </div>
            `;
        }
        let inputMethodHtml = '';
        if (meal.input_method) {
            const methodLabels = {
                'text': '📝 Text',
                'photo': '📷 Photo',
                'audio': '🎤 Voice',
                'text_photo': '📝📷 Text & Photo'
            };
            const label = methodLabels[meal.input_method] || '📝 Text';
            inputMethodHtml = `<span class="input-method-badge">${label}</span>`;
        }
        let promptHtml = '';
        if (meal.original_prompt) {
            promptHtml = `
                <div class="meal-prompt">
                    <strong>Original Prompt:</strong> "${meal.original_prompt}"
                </div>
            `;
        }
        let sourceHtml = '';
        if (meal.nutrition_source) {
            const sourceLabels = {
                'usda_vector_search': '🔍 USDA Database',
                'gemini_ai': '🤖 AI Analysis',
                'fallback': '⚠️ Fallback'
            };
            const sourceLabel = sourceLabels[meal.nutrition_source] || meal.nutrition_source;
            sourceHtml = `<span class="nutrition-source-badge">${sourceLabel}</span>`;
        }
        let nutritionHtml = `
            <div class="meal-nutrition">
                <span>${formatNumber(meal.calories)} cal</span>
                <span>${formatNumber(meal.protein)}g protein</span>
                <span>${formatNumber(meal.fat)}g fat</span>
                <span>${formatNumber(meal.carbs)}g carbs</span>
                <span>${formatNumber(meal.fiber)}g fiber</span>
            </div>
        `;
        mealEl.innerHTML = `
            <div class="meal-content">
                ${imagesHtml}
                <div class="meal-header">
                    <div class="meal-description">${meal.description}</div>
                    <div class="meal-badges">
                        ${inputMethodHtml}
                        ${sourceHtml}
                    </div>
                </div>
                ${promptHtml}
                <div class="meal-time">${formatTime(meal.created_at)}</div>
                ${nutritionHtml}
            </div>
            <div class="meal-actions">
                <button class="btn btn-secondary" onclick="handleRecalculateMeal(${meal.id}, '${(meal.original_prompt || meal.description).replace(/'/g, "\\'")}')">
                    <i class="fas fa-calculator"></i> Recalculate
                </button>
                <button class="btn btn-secondary" onclick="handleEditMeal(${meal.id})">
                    <i class="fas fa-pen"></i> Edit
                </button>
                <button class="btn btn-danger" onclick="handleDeleteMeal(${meal.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
    }

    // Helper to render edit mode
    function renderEdit() {
        let imagesHtml = '';
        if (meal.image_paths && meal.image_paths.length > 0) {
            imagesHtml = `
                <div class="meal-images">
                    ${meal.image_paths.map(path => `<img src="/${path}" alt="Meal photo" class="meal-image">`).join('')}
                </div>
            `;
        }
        mealEl.innerHTML = `
            <form class="meal-edit-form" enctype="multipart/form-data">
                ${imagesHtml}
                <div class="meal-header">
                    <textarea class="meal-description-input" name="description" rows="2">${meal.description}</textarea>
                </div>
                <div class="meal-nutrition" style="gap:0.5rem 1.5rem; margin-bottom:0.5rem;">
                    <label>Calories <input type="number" name="calories" value="${meal.calories}" min="0" step="1" style="width:70px;"></label>
                    <label>Protein <input type="number" name="protein" value="${meal.protein}" min="0" step="1" style="width:60px;"></label>
                    <label>Fat <input type="number" name="fat" value="${meal.fat}" min="0" step="1" style="width:60px;"></label>
                    <label>Carbs <input type="number" name="carbs" value="${meal.carbs}" min="0" step="1" style="width:60px;"></label>
                    <label>Fiber <input type="number" name="fiber" value="${meal.fiber}" min="0" step="1" style="width:60px;"></label>
                </div>
                <div style="margin-bottom:0.5rem;">
                    <label style="font-size:0.95em; color:#86868b;">Replace Photo(s): <input type="file" name="photos" accept="image/*" multiple></label>
                </div>
                <div class="meal-actions">
                    <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save</button>
                    <button type="button" class="btn btn-secondary meal-cancel-btn"><i class="fas fa-times"></i> Cancel</button>
                </div>
            </form>
        `;
        // Add listeners
        mealEl.querySelector('.meal-edit-form').onsubmit = async (e) => {
            e.preventDefault();
            const form = e.target;
            const formData = new FormData(form);
            // Only send fields that changed
            const patchData = new FormData();
            ['calories','protein','fat','carbs','fiber','description'].forEach(field => {
                if (formData.get(field) != null && formData.get(field) !== String(meal[field])) {
                    patchData.append(field, formData.get(field));
                }
            });
            if (formData.get('photos') && formData.get('photos').size > 0) {
                for (const file of formData.getAll('photos')) {
                    patchData.append('photos', file);
                }
            }
            try {
                await fetch(`/api/meals/${meal.id}`, {
                    method: 'PATCH',
                    body: patchData
                });
                showMessage('Meal updated successfully!');
                await loadTodaysData();
            } catch (err) {
                showMessage('Failed to update meal', 'error');
            }
        };
        mealEl.querySelector('.meal-cancel-btn').onclick = () => {
            renderView();
        };
    }

    // Initial render
    renderView();
    // Attach edit handler globally
    mealEl.handleEdit = renderEdit;
    return mealEl;
}

function updateMealsList(meals) {
    elements.todaysMeals.innerHTML = '';
    
    if (meals.length === 0) {
        elements.todaysMeals.innerHTML = '<p class="text-center" style="color: #86868b; padding: 2rem;">No meals added today</p>';
        return;
    }
    
    meals.forEach(meal => {
        elements.todaysMeals.appendChild(createMealElement(meal));
    });
}

function createHistoryElement(historyItem) {
    const historyEl = document.createElement('div');
    historyEl.className = 'history-item';
    historyEl.onclick = () => showDateDetails(historyItem.date);
    historyEl.innerHTML = `
        <div class="history-date">${formatDate(historyItem.date)}</div>
        <div class="history-totals">
            <span>${formatNumber(historyItem.total_calories)} cal</span>
            <span>${formatNumber(historyItem.total_protein)}g protein</span>
            <span>${formatNumber(historyItem.total_fat)}g fat</span>
            <span>${formatNumber(historyItem.total_carbs)}g carbs</span>
            <span>${formatNumber(historyItem.total_fiber)}g fiber</span>
        </div>
    `;
    return historyEl;
}

function updateHistoryList(history) {
    elements.historyList.innerHTML = '';
    
    if (history.length === 0) {
        elements.historyList.innerHTML = '<p class="text-center" style="color: #86868b; padding: 2rem;">No history available</p>';
        return;
    }
    
    history.forEach(item => {
        elements.historyList.appendChild(createHistoryElement(item));
    });
}

// Event Handlers
async function handleAddMeal() {
    console.log('[LOG] handleAddMeal started.');
    const description = elements.mealDescription.value.trim();
    const photos = selectedPhotos;
    
    console.log(`[LOG] Description: "${description}", Photos: ${photos.length}`);

    if (!description && photos.length === 0) {
        console.error('[ERROR] Validation failed: Description or photos are required.');
        showMessage('Please add a description or photos', 'error');
        return;
    }
    
    try {
        console.log('[LOG] Showing loading state and disabling button.');
        showLoading(true);
        elements.sendMealBtn.disabled = true;
        
        console.log('[LOG] Calling addMeal API...');
        const result = await addMeal(description, photos);
        console.log('[LOG] API call successful. Result:', result);
        
        showMessage('Meal added successfully!');
        
        // Show AI breakdown and analysis method
        if (elements.aiBreakdownContainer) {
            elements.aiBreakdownContainer.classList.remove('hidden');
            let methodLabel = result.analysisMethod ? `<div class="analysis-method"><strong>Analysis Method:</strong> ${result.analysisMethod}</div>` : '';
            let breakdownHtml = '';
        if (result.nutritionDetails && result.nutritionDetails.length > 0) {
                breakdownHtml = `<div class="section-header"><h3>Meal Decomposition</h3></div>` +
                    result.nutritionDetails.map(item => `
                        <div class="ingredient-item">
                            <div class="ingredient-header">
                                <span class="ingredient-name">${item.name}</span>
                                <span class="ingredient-weight">${item.weight_grams ? item.weight_grams + 'g' : ''}</span>
                            </div>
                            <div class="ingredient-nutrition">
                                <span><strong>Calories:</strong> ${formatNumber(item.calories)}</span>
                                <span><strong>Protein:</strong> ${formatNumber(item.protein)}g</span>
                                <span><strong>Fat:</strong> ${formatNumber(item.fat)}g</span>
                                <span><strong>Carbs:</strong> ${formatNumber(item.carbs)}g</span>
                                <span><strong>Fiber:</strong> ${formatNumber(item.fiber)}g</span>
                            </div>
                        </div>
                    `).join('');
            } else {
                breakdownHtml = '<div>No ingredient breakdown available.</div>';
            }
            elements.aiBreakdownContainer.innerHTML = methodLabel + breakdownHtml;
        }
        
        console.log('[LOG] Clearing form and refreshing data.');
        elements.mealDescription.value = '';
        clearPhotos();
        
        await loadTodaysData();
        console.log('[LOG] Data refreshed.');
        
    } catch (error) {
        console.error('[FATAL] An error occurred in handleAddMeal:', error);
        showMessage('Failed to add meal. Please check the console for details.', 'error');
    } finally {
        console.log('[LOG] Finalizing handleAddMeal: Hiding loading state and updating button.');
        showLoading(false);
        updateSubmitButton();
    }
}

async function handleDeleteMeal(mealId) {
    // if (!confirm('Are you sure you want to delete this meal?')) {
    //     return;
    // }
    
    try {
        await deleteMeal(mealId);
        showMessage('Meal deleted successfully!');
        await loadTodaysData(); // This already calls loadNutritionistAnalysis()
    } catch (error) {
        console.error('Error deleting meal:', error);
        showMessage('Failed to delete meal. Please try again.', 'error');
    }
}

function switchToToday() {
    currentView = 'today';
    elements.todayTab.classList.add('active');
    elements.historyTab.classList.remove('active');
    elements.historySection.classList.add('hidden');
    document.querySelector('.add-meal-section').classList.remove('hidden');
    document.querySelector('.daily-totals-section').classList.remove('hidden');
    document.querySelector('.meals-section').classList.remove('hidden');
}

function switchToHistory() {
    currentView = 'history';
    elements.historyTab.classList.add('active');
    elements.todayTab.classList.remove('active');
    elements.historySection.classList.remove('hidden');
    document.querySelector('.add-meal-section').classList.add('hidden');
    document.querySelector('.daily-totals-section').classList.add('hidden');
    document.querySelector('.meals-section').classList.add('hidden');
    
    loadHistory();
}

async function showDateDetails(date) {
    try {
        const data = await getMealsForDate(date);
        
        // Create a modal or alert with date details
        // alert(`
        // Date: ${formatDate(date)}
        //
        // Totals:
        // - Calories: ${formatNumber(data.totals.total_calories)}
        // - Protein: ${formatNumber(data.totals.total_protein)}g
        // - Fat: ${formatNumber(data.totals.total_fat)}g
        // - Carbs: ${formatNumber(data.totals.total_carbs)}g
        // - Fiber: ${formatNumber(data.totals.total_fiber)}g
        //
        // Meals: ${data.meals.length}
        //         `);
        
    } catch (error) {
        console.error('Error loading date details:', error);
        showMessage('Failed to load date details', 'error');
    }
}

async function handleNewDay() {
    const today = new Date().toISOString().split('T')[0];
    showMessage(`New day started: ${formatDate(today)}`);
    await loadTodaysData();
}

async function handleExportCSV() {
    try {
        await exportCSV();
        showMessage('CSV exported successfully!');
    } catch (error) {
        console.error('Error exporting CSV:', error);
        showMessage('Failed to export CSV. Please try again.', 'error');
    }
}

async function handleClearHistory() {
    // if (!confirm('Are you absolutely sure you want to delete all meal history? This action cannot be undone.')) {
    //     return;
    // }

    try {
        await clearHistory();
        showMessage('All history has been cleared.');
        await loadHistory(); // Refresh the list (it should be empty)
    } catch (error) {
        console.error('Error clearing history:', error);
        showMessage('Failed to clear history. Please try again.', 'error');
    }
}

// Data Loading Functions
async function loadTodaysData() {
    try {
        const data = await getTodaysMeals();
        updateTodaysTotals(data);
        updateMealsList(data.meals);
        // Load nutritionist analysis after meals are loaded
        loadNutritionistAnalysis();
    } catch (error) {
        console.error('Error loading today\'s data:', error);
        showMessage('Failed to load today\'s data', 'error');
    }
}

// Nutritionist Analysis Functions
async function getNutritionistAnalysis() {
    return await apiRequest('/api/nutritionist/today');
}

async function loadNutritionistAnalysis() {
    const analysisText = document.getElementById('nutritionist-analysis-text');
    const loadingEl = document.getElementById('nutritionist-loading');
    
    try {
        // Show loading
        loadingEl.classList.remove('hidden');
        analysisText.innerHTML = '';
        
        const result = await getNutritionistAnalysis();
        
        // Hide loading and show analysis
        loadingEl.classList.add('hidden');
        
        if (result.analysis) {
            // Convert markdown-style formatting to HTML
            let formattedAnalysis = result.analysis
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/^- (.*$)/gm, '<li>$1</li>')
                .replace(/(\n|^)(#{1,3})\s+(.*)/g, (match, prefix, hashes, content) => {
                    const level = hashes.length;
                    return `${prefix}<h${level + 2}>${content}</h${level + 2}>`;
                });
            
            // Wrap consecutive list items in ul tags
            formattedAnalysis = formattedAnalysis.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
            
            // Add timing context footer if available
            if (result.timing_context) {
                const timingInfo = `<div class="analysis-timing">
                    <small><i class="fas fa-clock"></i> Analysis at ${result.timing_context.current_time} 
                    ${result.timing_context.last_meal_time !== 'No meals yet' ? 
                        `• Last meal: ${result.timing_context.last_meal_time}` : ''}
                    • ${Math.round(result.timing_context.day_progress)}% of day passed</small>
                </div>`;
                formattedAnalysis += timingInfo;
            }
            
            analysisText.innerHTML = formattedAnalysis;
        } else {
            analysisText.innerHTML = '⚠️ No analysis available at the moment.';
        }
        
    } catch (error) {
        console.error('Error loading nutritionist analysis:', error);
        loadingEl.classList.add('hidden');
        analysisText.innerHTML = '⚠️ **Analysis temporarily unavailable** \n\nUnable to generate nutritional insights at the moment. Please try again later.';
    }
}

async function refreshNutritionistAnalysis() {
    const refreshBtn = document.getElementById('refreshAnalysisBtn');
    if (refreshBtn) {
        const originalIcon = refreshBtn.querySelector('i');
        originalIcon.className = 'fas fa-spinner fa-spin';
        refreshBtn.disabled = true;
    }
    
    await loadNutritionistAnalysis();
    
    if (refreshBtn) {
        const icon = refreshBtn.querySelector('i');
        icon.className = 'fas fa-sync-alt';
        refreshBtn.disabled = false;
    }
}

async function loadHistory() {
    try {
        const history = await getHistory();
        updateHistoryList(history);
    } catch (error) {
        console.error('Error loading history:', error);
        showMessage('Failed to load history', 'error');
    }
}

// Vector DB toggle logic
async function fetchVectorDbMode() {
    try {
        const res = await fetch('/api/vector-db-mode');
        const data = await res.json();
        elements.vectorDbSwitchInline.checked = !!data.enabled;
        elements.vectorDbLabel.textContent = data.enabled ? 'Hybrid (Vector+AI)' : 'AI Only';
    } catch (e) { console.error('Failed to fetch vector DB mode', e); }
}
async function setVectorDbMode(enabled) {
    try {
        await fetch('/api/vector-db-mode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled })
        });
        elements.vectorDbLabel.textContent = enabled ? 'Hybrid (Vector+AI)' : 'AI Only';
    } catch (e) { console.error('Failed to set vector DB mode', e); }
}

// Event Listeners
window.addEventListener('DOMContentLoaded', () => {
    elements = {
        mealDescription: document.getElementById('mealDescription'),
        addPhotoBtn: document.getElementById('addPhotoBtn'),
        photoInput: document.getElementById('photoInput'),
        photoPreviewContainer: document.getElementById('photoPreviewContainer'),
        sendMealBtn: document.getElementById('sendMealBtn'),
        vectorDbSwitchInline: document.getElementById('vectorDbSwitchInline'),
        // Display
        loadingIndicator: document.getElementById('loadingIndicator'),
        todaysMeals: document.getElementById('todaysMeals'),
        // Navigation
        todayTab: document.getElementById('todayTab'),
        historyTab: document.getElementById('historyTab'),
        historySection: document.getElementById('history-section'),
        historyList: document.getElementById('history-list'),
        // Actions
        newDayBtn: document.getElementById('newDayBtn'),
        exportBtn: document.getElementById('exportBtn'),
        messageContainer: document.getElementById('messageContainer'),
        aiBreakdownContainer: document.getElementById('aiBreakdownContainer'),
        clearHistoryBtn: document.getElementById('clear-history-btn'),
        dailyTotals: {
            calories: document.getElementById('total-calories'),
            protein: document.getElementById('total-protein'),
            fat: document.getElementById('total-fat'),
            carbs: document.getElementById('total-carbs'),
            fiber: document.getElementById('total-fiber')
        },
        propertiesTab: document.getElementById('propertiesTab'),
        propertiesSection: document.getElementById('properties-section'),
        goalsForm: document.getElementById('goalsForm'),
        goalCalories: document.getElementById('goalCalories'),
        goalProtein: document.getElementById('goalProtein'),
        goalFat: document.getElementById('goalFat'),
        goalCarbs: document.getElementById('goalCarbs'),
        goalFiber: document.getElementById('goalFiber'),
        dailyTotalsContent: document.getElementById('daily-totals-content'),
        totalCalories: document.getElementById('total-calories'),
        totalProtein: document.getElementById('total-protein'),
        totalFat: document.getElementById('total-fat'),
        totalCarbs: document.getElementById('total-carbs'),
        totalFiber: document.getElementById('total-fiber'),
    };
    
    // + icon triggers image upload
    if (elements.addPhotoBtn && elements.photoInput) {
        elements.addPhotoBtn.addEventListener('click', () => elements.photoInput.click());
    elements.photoInput.addEventListener('change', handlePhotoInput);
    }

    // Send icon submits meal
    if (elements.sendMealBtn) {
        elements.sendMealBtn.addEventListener('click', handleAddMeal);
    }

    // Inline vector toggle
    if (elements.vectorDbSwitchInline) {
        elements.vectorDbSwitchInline.addEventListener('change', (e) => {
            setVectorDbMode(e.target.checked);
        });
        // Sync toggle with backend
        fetchVectorDbMode().then();
    }
    
    // Navigation
    elements.todayTab.addEventListener('click', () => navigateTo('today'));
    elements.historyTab.addEventListener('click', () => navigateTo('history'));
    elements.propertiesTab.addEventListener('click', () => navigateTo('properties'));

    // Actions
    elements.newDayBtn.addEventListener('click', handleNewDay);
    elements.exportBtn.addEventListener('click', handleExportCSV);
    elements.clearHistoryBtn.addEventListener('click', handleClearHistory);
    
    // Nutritionist analysis refresh button
    const refreshAnalysisBtn = document.getElementById('refreshAnalysisBtn');
    if (refreshAnalysisBtn) {
        refreshAnalysisBtn.addEventListener('click', refreshNutritionistAnalysis);
    }
    
    // Enter key support for text input
    elements.mealDescription.addEventListener('keypress', (e) => {
        if ((e.key === 'Enter' && (e.metaKey || e.ctrlKey)) || (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey)) {
            e.preventDefault();
            if (!elements.sendMealBtn.disabled) {
                handleAddMeal();
            }
        }
    });
    // Enable/disable send button on input
    elements.mealDescription.addEventListener('input', updateSubmitButton);
    
    // Initial state
    updateSubmitButton();
    
    // Initial data load
    loadTodaysData();

    // Handle browser navigation (back/forward)
    window.addEventListener('popstate', () => {
        showSectionFromLocation();
    });

    // On load, show correct section
    showSectionFromLocation();

    // Add this after elements are initialized
    if (elements.goalsForm) {
        elements.goalsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveGoals();
            showMessage('Goals saved!');
        });
        
        // Add real-time calorie calculation when macros change
        [elements.goalProtein, elements.goalFat, elements.goalCarbs].forEach(input => {
            if (input) {
                input.addEventListener('input', calculateCaloriesFromMacros);
                input.addEventListener('change', calculateCaloriesFromMacros);
            }
        });
    }
});

// Make functions globally available
window.handleDeleteMeal = handleDeleteMeal;
window.handleRecalculateMeal = handleRecalculateMeal;

async function handleRecalculateMeal(mealId, currentPrompt) {
    const newPrompt = prompt('Edit the description to recalculate nutrition:', currentPrompt);
    
    if (!newPrompt || newPrompt.trim() === '') {
        return;
    }
    
    try {
        showLoading(true);
        const result = await recalculateMeal(mealId, newPrompt.trim());
        
        showMessage('Meal recalculated successfully!');
        
        if (result.nutritionDetails && result.nutritionDetails.length > 0) {
            displayAIBreakdown(result.nutritionDetails, result.nutritionData);
        }

        // Refresh today's data to show updated values
        await loadTodaysData();
        
    } catch (error) {
        console.error('Error recalculating meal:', error);
        showMessage('Failed to recalculate meal. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

function displayAIBreakdown(ingredients, totals) {
    elements.aiBreakdownContainer.classList.remove('hidden');

    let ingredientsHtml = ingredients.map(item => `
        <div class="ingredient-item">
            <div class="ingredient-header">
                <span class="ingredient-name">${item.name}</span>
                <span class="ingredient-weight">${item.weight_grams ? item.weight_grams + 'g' : ''}</span>
            </div>
            <div class="ingredient-nutrition">
                <span><strong>Calories:</strong> ${formatNumber(item.calories)}</span>
                <span><strong>Protein:</strong> ${formatNumber(item.protein)}g</span>
                <span><strong>Fat:</strong> ${formatNumber(item.fat)}g</span>
                <span><strong>Carbs:</strong> ${formatNumber(item.carbs)}g</span>
                <span><strong>Fiber:</strong> ${formatNumber(item.fiber)}g</span>
            </div>
        </div>
    `).join('');

    elements.aiBreakdownContainer.innerHTML = `
        <div class="section-header">
            <h3>AI Calculation Breakdown</h3>
        </div>
        <div class="breakdown-body">
            <p>Here's how the AI analyzed your meal:</p>
            <div class="ingredient-breakdown">
                ${ingredientsHtml}
            </div>
            <div class="meal-nutrition-summary">
                <strong>Total:</strong>
                <span>${formatNumber(totals.calories)} cal</span>
                <span>${formatNumber(totals.protein)}g protein</span>
                <span>${formatNumber(totals.fat)}g fat</span>
                <span>${formatNumber(totals.carbs)}g carbs</span>
                <span>${formatNumber(totals.fiber)}g fiber</span>
            </div>
        </div>
    `;
}

function switchTab(tab) {
    // Hide all main sections
    document.querySelectorAll('.main-section').forEach(s => s.classList.add('hidden'));
    // Remove active from all nav-btns
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if (tab === 'today') {
        document.getElementById('today-section').classList.remove('hidden');
        elements.todayTab.classList.add('active');
    } else if (tab === 'history') {
        document.getElementById('history-section').classList.remove('hidden');
        elements.historyTab.classList.add('active');
    } else if (tab === 'properties') {
        document.getElementById('properties-section').classList.remove('hidden');
        elements.propertiesTab.classList.add('active');
        loadGoals();
    }
}

// Calculate calories from macronutrients
function calculateCaloriesFromMacros() {
    const protein = Number(elements.goalProtein.value) || 0;
    const fat = Number(elements.goalFat.value) || 0;
    const carbs = Number(elements.goalCarbs.value) || 0;
    
    // Calories = (Protein × 4) + (Fat × 9) + (Carbs × 4)
    const calories = Math.round((protein * 4) + (fat * 9) + (carbs * 4));
    
    elements.goalCalories.value = calories;
    return calories;
}

function loadGoals() {
    const goals = JSON.parse(localStorage.getItem('nutritionGoals') || '{}');
    elements.goalProtein.value = goals.protein || '';
    elements.goalFat.value = goals.fat || '';
    elements.goalCarbs.value = goals.carbs || '';
    elements.goalFiber.value = goals.fiber || '';
    
    // Calculate calories from macros
    calculateCaloriesFromMacros();
}

function saveGoals() {
    // Calculate calories automatically from macros
    const calculatedCalories = calculateCaloriesFromMacros();
    
    const goals = {
        calories: calculatedCalories,
        protein: Number(elements.goalProtein.value) || 0,
        fat: Number(elements.goalFat.value) || 0,
        carbs: Number(elements.goalCarbs.value) || 0,
        fiber: Number(elements.goalFiber.value) || 0
    };
    localStorage.setItem('nutritionGoals', JSON.stringify(goals));
    updateTodaysTotals(lastTotalsData);
}

let lastTotalsData = null;
function updateTodaysTotals(data) {
    lastTotalsData = data;
    const goals = JSON.parse(localStorage.getItem('nutritionGoals') || '{}');
    function pct(val, goal) {
        if (!goal || goal <= 0) return 0;
        return Math.round((val/goal)*100);
    }
    // Set values
    elements.totalCalories.textContent = data.totals.total_calories;
    elements.totalProtein.textContent = data.totals.total_protein + 'g';
    elements.totalFat.textContent = data.totals.total_fat + 'g';
    elements.totalCarbs.textContent = data.totals.total_carbs + 'g';
    elements.totalFiber.textContent = data.totals.total_fiber + 'g';
    // Set progress bars and percent labels
    const progressData = [
        {val: data.totals.total_calories, goal: goals.calories, bar: 'progress-calories', percent: 'percent-calories'},
        {val: data.totals.total_protein, goal: goals.protein, bar: 'progress-protein', percent: 'percent-protein'},
        {val: data.totals.total_fat, goal: goals.fat, bar: 'progress-fat', percent: 'percent-fat'},
        {val: data.totals.total_carbs, goal: goals.carbs, bar: 'progress-carbs', percent: 'percent-carbs'},
        {val: data.totals.total_fiber, goal: goals.fiber, bar: 'progress-fiber', percent: 'percent-fiber'}
    ];
    progressData.forEach(({val, goal, bar, percent}) => {
        const percentVal = pct(val, goal);
        const barEl = document.getElementById(bar);
        const percentEl = document.getElementById(percent);
        if (barEl) barEl.style.width = Math.min(percentVal, 100) + '%';
        if (percentEl) percentEl.textContent = (goal && goal > 0) ? percentVal + '% completed' : '0% completed';
    });
}

function navigateTo(page) {
    window.history.pushState({}, '', `#${page}`);
    showSectionFromLocation();
}

function showSectionFromLocation() {
    const hash = window.location.hash.replace('#', '') || 'today';
    switchTab(hash);
}

// Add global handler for edit button
window.handleEditMeal = function(mealId) {
    const mealEl = document.querySelector(`.meal-item[data-meal-id="${mealId}"]`);
    if (mealEl && mealEl.handleEdit) mealEl.handleEdit();
}; 