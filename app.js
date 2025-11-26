// Goally App - Main JavaScript

const firebaseConfig = {
  apiKey: "AIzaSyAYTTANU8bM8FZAiDoZEdyYKHT7Cj43L-Y",
  authDomain: "goally-dda53.firebaseapp.com",
  projectId: "goally-dda53",
  storageBucket: "goally-dda53.firebasestorage.app",
  messagingSenderId: "230771902995",
  appId: "1:230771902995:web:72b1513208c0c960600de6",
  measurementId: "G-0XJZ5VNGE3"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null; // Variable to hold the current user state
let isDataLoadedSuccessfully = false; // <-- ADD THIS FLAG

// Data Structure
let appData = {
    goals: [],
    keyResults: [],
    initiatives: []
};

// Weight level descriptions
const weightLevelDescriptions = {
    1: "Lowest Priority", 2: "Low Priority", 3: "Medium Priority", 4: "High Priority", 5: "Highest Priority"
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
    renderGoals();
});

// Setup Event Listeners
function setupEventListeners() {
    document.getElementById('addGoalBtn').addEventListener('click', openAddGoalModal);
    document.getElementById('goalForm').addEventListener('submit', saveGoal);
    document.getElementById('krForm').addEventListener('submit', saveKr);
    document.getElementById('initiativeForm').addEventListener('submit', saveInitiative);
    
    // Add listeners for new auth buttons
    document.getElementById('signInBtn').addEventListener('click', signInWithGoogle);
    document.getElementById('signOutBtn').addEventListener('click', signOut);

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) e.target.style.display = 'none';
        if (!e.target.closest('.kr-menu-container')) closeAllKrMenus();
    });
}

// Local Storage Functions
function saveData() {
    // SECURITY FIX: Only save to Local Storage if the user is NOT logged in.
    // We do not want to cache private cloud data in the browser's local storage.
    if (!currentUser) {
        localStorage.setItem('goallyData', JSON.stringify(appData));
    }
    
    // If logged in, save to Cloud only
    if (currentUser) {
        saveDataToFirestore();
    }
}

function loadData() {
    const stored = localStorage.getItem('goallyData');
    // Only load from local storage if not logged in.
    // If logged in, data will be loaded from Firestore.
    if (stored && !currentUser) { 
        const parsedData = JSON.parse(stored);
        appData = {
            goals: parsedData.goals || [],
            keyResults: parsedData.keyResults || [],
            initiatives: parsedData.initiatives || []
        };
    }
}

// Generate unique ID
function generateId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// --- CORE DATA MODIFICATION FUNCTIONS ---
// All functions that change data now follow a simple rule:
// 1. Modify the appData object.
// 2. Call saveData().
// 3. Call renderGoals().

function saveGoal(e) {
    e.preventDefault();
    const id = document.getElementById('goalId').value;
    const name = document.getElementById('goalName').value.trim();
    if (id) {
        const goal = appData.goals.find(g => g.id === id);
        if(goal) goal.name = name;
    } else {
        appData.goals.push({ id: generateId('goal'), name, createdAt: Date.now() });
    }
    closeModal('goalModal');
    saveData();
    renderGoals();
}

function saveKr(e) {
    e.preventDefault();
    const id = document.getElementById('krId').value;
    const goalId = document.getElementById('krGoalId').value;
    const name = document.getElementById('krName').value.trim();
    const weight = parseFloat(document.getElementById('krWeight').value);
    if (!goalId) return alert('Goal ID is missing');
    if (id) {
        const kr = appData.keyResults.find(k => k.id === id);
        if(kr) { kr.name = name; kr.weight = weight; }
    } else {
        appData.keyResults.push({ id: generateId('kr'), goalId, name, weight, createdAt: Date.now() });
    }
    closeModal('krModal');
    saveData();
    renderGoals();
}

function saveInitiative(e) {
    e.preventDefault();
    const id = document.getElementById('initiativeId').value;
    const krId = document.getElementById('initiativeKrId').value;
    const name = document.getElementById('initiativeName').value.trim();
    const weightLevel = parseInt(document.getElementById('initiativeWeightLevel').value);
    const status = document.getElementById('initiativeStatus').value;
    if (!krId) return alert('KR ID is missing');
    if (id) {
        const initiative = appData.initiatives.find(i => i.id === id);
        if(initiative) { Object.assign(initiative, { name, weightLevel, status }); }
    } else {
        appData.initiatives.push({ id: generateId('init'), krId, name, weightLevel, status, createdAt: Date.now() });
    }
    closeModal('initiativeModal');
    saveData();
    renderGoals();
}

function deleteGoal(goalId) {
    if (!confirm(`Delete this goal and all its Key Results and Initiatives?`)) return;
    const krsInGoal = appData.keyResults.filter(kr => kr.goalId === goalId);
    const krIdsInGoal = krsInGoal.map(kr => kr.id);
    appData.initiatives = appData.initiatives.filter(i => !krIdsInGoal.includes(i.krId));
    appData.keyResults = appData.keyResults.filter(kr => kr.goalId !== goalId);
    appData.goals = appData.goals.filter(g => g.id !== goalId);
    saveData();
    renderGoals();
}

function deleteKr(krId) {
    if (!confirm(`Delete this Key Result and all its initiatives?`)) return;
    appData.initiatives = appData.initiatives.filter(i => i.krId !== krId);
    appData.keyResults = appData.keyResults.filter(k => k.id !== krId);
    saveData();
    renderGoals();
}

function deleteInitiative(initiativeId) {
    if (!confirm('Delete this initiative?')) return;
    appData.initiatives = appData.initiatives.filter(i => i.id !== initiativeId);
    saveData();
    renderGoals();
}

function updateInitiativeStatus(initiativeId, newStatus) {
    const initiative = appData.initiatives.find(i => i.id === initiativeId);
    if (initiative && initiative.status !== newStatus) {
        initiative.status = newStatus;
        saveData();
        renderGoals();
    }
}

// --- "PURE" CALCULATION FUNCTIONS ---
// These functions ONLY read from appData and return a number. They NEVER modify the global data object.

function calculateKrCompletion(krId) {
    const initiatives = appData.initiatives.filter(i => i.krId === krId);
    if (initiatives.length === 0) return 0;
    const totalWeight = initiatives.reduce((sum, i) => sum + i.weightLevel, 0);
    const doneWeight = initiatives.filter(i => i.status === 'Done').reduce((sum, i) => sum + i.weightLevel, 0);
    if (totalWeight === 0) return 0;
    const completion = (doneWeight / totalWeight) * 100;
    return parseFloat(completion.toFixed(2));
}

function calculateGoalCompletion(goalId) {
    const krs = appData.keyResults.filter(kr => kr.goalId === goalId);
    if (krs.length === 0) return 0;
    const totalCompletion = krs.reduce((sum, kr) => {
        const krCompletion = calculateKrCompletion(kr.id); // Call the pure function
        return sum + (kr.weight * krCompletion / 100);
    }, 0);
    return parseFloat(totalCompletion.toFixed(2));
}

// --- RENDER FUNCTIONS ---

function renderGoals() {
    const container = document.getElementById('goalsContainer');
    const emptyState = document.getElementById('emptyState');
    const currentlyExpanded = { goals: new Set(), krs: new Set() };
    document.querySelectorAll('.collapsible-content.expanded').forEach(el => {
        if (el.id.startsWith('kr-section-')) currentlyExpanded.goals.add(el.id.replace('kr-section-', ''));
        else if (el.id.startsWith('initiatives-')) currentlyExpanded.krs.add(el.id.replace('initiatives-', ''));
    });
    
    // container.innerHTML = ''; // The "erase" step
    container.querySelectorAll('.goal-card').forEach(card => card.remove());
    
    if (!appData.goals || appData.goals.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    // Re-draw goals
    appData.goals.forEach(goal => {
        container.appendChild(createGoalCard(goal, currentlyExpanded));
    });
}

function createGoalCard(goal, expandedStates) {
    const card = document.createElement('div');
    card.className = 'goal-card';
    card.id = `goal-${goal.id}`; // Add ID for toggle function to find it
    const completion = calculateGoalCompletion(goal.id); 
    const isExpanded = expandedStates.goals.has(goal.id);
    card.innerHTML = `
        <div class="goal-header">
            <div class="goal-info"><button class="expand-btn" onclick="toggleGoalExpand('${goal.id}')"><svg class="expand-icon ${isExpanded ? 'expanded' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg></button><h2>${goal.name}</h2></div>
            <div class="goal-header-right"><div class="progress-display"><span class="progress-percentage">${completion}%</span><div class="progress-bar-container compact"><div class="progress-bar ${getProgressClass(completion)}" style="width: ${completion}%"></div></div></div><button class="icon-btn" onclick="openEditGoalModal('${goal.id}')" title="Edit Goal"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button><button class="icon-btn icon-btn-danger" onclick="deleteGoal('${goal.id}')" title="Delete Goal"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button></div>
        </div>
        <div class="collapsible-content ${isExpanded ? 'expanded' : ''}" id="kr-section-${goal.id}"><div class="kr-section">${createKrList(goal.id, expandedStates)}<div class="add-kr-container"><button class="btn btn--secondary btn--sm" onclick="openAddKrModal('${goal.id}')">+ Add Key Result</button></div></div></div>`;
    return card;
}

function createKrList(goalId, expandedStates) {
    const krs = appData.keyResults.filter(kr => kr.goalId === goalId);
    if (krs.length === 0) return `<p style="text-align: center; opacity: 0.7;">No Key Results yet.</p>`;
    return `<div class="kr-list">${krs.map(kr => {
        const completion = calculateKrCompletion(kr.id); // Calculate fresh value just-in-time
        const isExpanded = expandedStates.krs.has(kr.id);
        return `<div class="kr-item">
                    <div class="kr-item-header">
                        <button class="expand-btn" onclick="toggleKrExpand('${kr.id}')"><svg class="expand-icon ${isExpanded ? 'expanded' : ''}" id="expand-kr-${kr.id}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                        <div class="kr-info"><h3>${kr.name}</h3></div>
                        <div class="kr-header-right">
                            <span class="kr-weight">${kr.weight}%</span><div class="progress-display"><span class="progress-percentage">${completion}%</span></div>
                            <div class="kr-menu-container">
                                <button class="icon-btn" onclick="toggleKrMenu('${kr.id}')" title="More options"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg></button>
                                <div class="kr-menu" id="menu-kr-${kr.id}"><a href="#" onclick="event.preventDefault(); openEditKrModal('${kr.id}')">Edit</a><a href="#" onclick="event.preventDefault(); deleteKr('${kr.id}')" class="danger">Delete</a></div>
                            </div>
                        </div>
                    </div>
                    <div class="collapsible-content ${isExpanded ? 'expanded' : ''}" id="initiatives-${kr.id}"><div class="initiative-section">${createInitiativeTable(kr.id)}<div class="add-initiative-container"><button class="btn btn--secondary btn--sm" onclick="openAddInitiativeModal('${kr.id}')">+ Add Initiative</button></div></div></div>
                </div>`;
    }).join('')}</div>`;
}

function createInitiativeTable(krId) {
    const initiatives = appData.initiatives.filter(i => i.krId === krId);
    if (initiatives.length === 0) return `<p style="text-align: center; margin-top: 15px; opacity: 0.7;">No initiatives yet.</p>`;
    return `<table class="initiative-table"><thead><tr><th>Initiative</th><th>Weight</th><th>Status</th><th>Actions</th></tr></thead><tbody>${initiatives.map(initiative => `
        <tr>
            <td>${initiative.name}</td>
            <td><div class="weight-level">${createWeightStars(initiative.weightLevel)}</div></td>
            <td><select class="status-badge status-${initiative.status.toLowerCase().replace(' ', '-')}" onchange="updateInitiativeStatus('${initiative.id}', this.value)"><option value="Pending" ${initiative.status === 'Pending' ? 'selected' : ''}>Pending</option><option value="In Progress" ${initiative.status === 'In Progress' ? 'selected' : ''}>In Progress</option><option value="Done" ${initiative.status === 'Done' ? 'selected' : ''}>Done</option></select></td>
            <td class="initiative-actions-cell">
    <button class="icon-btn" onclick="openEditInitiativeModal('${initiative.id}')" title="Edit Initiative">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
    </button>
    <button class="icon-btn icon-btn-danger" onclick="deleteInitiative('${initiative.id}')" title="Delete Initiative">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
    </button>
</td>
        </tr>`).join('')}</tbody></table>`;
}

// --- HELPER & UI FUNCTIONS ---

function createWeightStars(level) {
    let stars = '';
    for (let i = 1; i <= 5; i++) stars += `<span class="weight-star ${i <= level ? '' : 'empty'}">★</span>`;
    return stars;
}

function getProgressClass(percentage) {
    if (percentage < 34) return 'progress-low';
    if (percentage < 67) return 'progress-medium';
    return 'progress-high';
}

function toggleGoalExpand(goalId) {
    const content = document.getElementById(`kr-section-${goalId}`);
    const icon = document.querySelector(`#goal-${goalId} .expand-icon`);
    if(content && icon) {
        content.classList.toggle('expanded');
        icon.classList.toggle('expanded');
    }
}

function toggleKrExpand(krId) {
    const content = document.getElementById(`initiatives-${krId}`);
    const icon = document.getElementById(`expand-kr-${krId}`);
    if(content && icon) {
        content.classList.toggle('expanded');
        icon.classList.toggle('expanded');
    }
}

function closeAllKrMenus() {
    document.querySelectorAll('.kr-menu.show').forEach(menu => menu.classList.remove('show'));
}

function toggleKrMenu(krId) {
    const menu = document.getElementById(`menu-kr-${krId}`);
    if(!menu) return;
    const isShowing = menu.classList.contains('show');
    closeAllKrMenus();
    if (!isShowing) menu.classList.add('show');
}

// Modal and Form functions
function openAddGoalModal() {
    document.getElementById('goalModalTitle').textContent = 'Add Goal';
    document.getElementById('goalForm').reset();
    document.getElementById('goalId').value = '';
    document.getElementById('goalModal').style.display = 'block';
}

function openEditGoalModal(goalId) {
    const goal = appData.goals.find(g => g.id === goalId);
    if (!goal) return;
    document.getElementById('goalModalTitle').textContent = 'Edit Goal';
    document.getElementById('goalId').value = goal.id;
    document.getElementById('goalName').value = goal.name;
    document.getElementById('goalModal').style.display = 'block';
}

function openAddKrModal(goalId) {
    document.getElementById('krModalTitle').textContent = 'Add Key Result';
    document.getElementById('krForm').reset();
    document.getElementById('krId').value = '';
    document.getElementById('krGoalId').value = goalId;
    document.getElementById('krModal').style.display = 'block';
}

function openEditKrModal(krId) {
    const kr = appData.keyResults.find(k => k.id === krId);
    if (!kr) return;
    document.getElementById('krModalTitle').textContent = 'Edit Key Result';
    document.getElementById('krId').value = kr.id;
    document.getElementById('krGoalId').value = kr.goalId;
    document.getElementById('krName').value = kr.name;
    document.getElementById('krWeight').value = kr.weight;
    document.getElementById('krModal').style.display = 'block';
}

function openAddInitiativeModal(krId) {
    document.getElementById('initiativeModalTitle').textContent = 'Add Initiative';
    document.getElementById('initiativeForm').reset();
    document.getElementById('initiativeId').value = '';
    document.getElementById('initiativeKrId').value = krId;
    document.getElementById('initiativeWeightLevel').value = "3";
    updateWeightLevelDisplay();
    document.getElementById('initiativeModal').style.display = 'block';
}

function openEditInitiativeModal(initiativeId) {
    const initiative = appData.initiatives.find(i => i.id === initiativeId);
    if (!initiative) return;
    document.getElementById('initiativeModalTitle').textContent = 'Edit Initiative';
    document.getElementById('initiativeId').value = initiative.id;
    document.getElementById('initiativeKrId').value = initiative.krId;
    document.getElementById('initiativeName').value = initiative.name;
    document.getElementById('initiativeWeightLevel').value = initiative.weightLevel;
    document.getElementById('initiativeStatus').value = initiative.status;
    updateWeightLevelDisplay();
    document.getElementById('initiativeModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function updateWeightLevelDisplay() {
    const slider = document.getElementById('initiativeWeightLevel');
    if(!slider) return;
    const level = slider.value;
    const valueDisplay = document.getElementById('weightLevelValue');
    const labelDisplay = document.getElementById('weightLevelLabel');
    if (valueDisplay) valueDisplay.textContent = level;
    if (labelDisplay) labelDisplay.textContent = weightLevelDescriptions[level];
}

// --- START: NEW FIREBASE FUNCTIONS ---

// Listen for authentication state changes
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in.
        currentUser = user;
        updateUIForUser(user);
        handleUserData();
    } else {
        // User is signed out.
        currentUser = null;
        isDataLoadedSuccessfully = false;
        updateUIForGuest();
        // Clear current data and reload from local storage to show local-only view
        appData = { goals: [], keyResults: [], initiatives: [] };
        loadData();
        renderGoals();
    }
});

// Decides whether to upload local data or download cloud data
async function handleUserData() {
    const localDataExists = (appData.goals && appData.goals.length > 0);
    const userDocRef = db.collection('users').doc(currentUser.uid);
    const doc = await userDocRef.get();

    if (localDataExists && !doc.exists) {
        // User has local data and it's their first time signing in -> UPLOAD local data
        console.log("Local data exists, uploading to Firebase...");
        await saveDataToFirestore();
    } else {
        // Otherwise, always download from Firebase to get the latest cloud version
        console.log("Loading data from Firebase...");
        await loadDataFromFirestore();
    }
    renderGoals();
}


// Sign in with Google
function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(error => console.error("Sign in error", error));
}

// Sign out
function signOut() {
    auth.signOut().catch(error => console.error("Sign out error", error));
}

// Update UI when user is logged in
function updateUIForUser(user) {
    document.getElementById('signInBtn').style.display = 'none';
    document.getElementById('userProfile').style.display = 'flex';
    document.getElementById('userName').textContent = user.displayName;
    document.getElementById('userPhoto').src = user.photoURL;
}

// Update UI when user is logged out
function updateUIForGuest() {
    document.getElementById('signInBtn').style.display = 'block';
    document.getElementById('userProfile').style.display = 'none';
}

// Save the entire appData object to Firestore
async function saveDataToFirestore() {
    if (!currentUser) return;

    // --- THE SMARTER BOUNCER ---
    if (!isDataLoadedSuccessfully) {
        console.error("CRITICAL: Save aborted. The initial data from the cloud was not loaded successfully. Saving now would overwrite your cloud data.");
        alert("Save failed: Your data couldn't be loaded from the cloud. Please check your internet connection and refresh the page to prevent data loss.");
        return; // <-- EJECT!
    }

    try {
        // Add or update the lastModified timestamp
        appData.lastModified = new Date().getTime();
        await db.collection('users').doc(currentUser.uid).set(appData);
        console.log("Data saved to Firestore.");
    } catch (error) {
        console.error("Error saving data to Firestore:", error);
    }
}

// Load data from Firestore
async function loadDataFromFirestore() {
    if (!currentUser) return;
    isDataLoadedSuccessfully = false; // Reset flag at the start of every load attempt
    console.log('Loading data from Firestore...');
    try {
        const doc = await db.collection('users').doc(currentUser.uid).get();

        if (doc.exists) {
            const data = doc.data();
            appData = {
                goals: data.goals || [],
                keyResults: data.keyResults || [],
                initiatives: data.initiatives || [],
                lastModified: data.lastModified || 0
            };
            console.log("Data loaded from Firestore document.");
        } else {
            console.log("No Firestore document found for new user.");
            // For a new user, the "load" is conceptually successful because we're starting fresh.
            // We must set the flag to true, otherwise their very first save will be blocked.
            appData = { goals: [], keyResults: [], initiatives: [] };
        }
        
        isDataLoadedSuccessfully = true; // <-- SET FLAG TO TRUE ON SUCCESS
        console.log("Data load successful. Flag set to true.");

    } catch (error) {
        isDataLoadedSuccessfully = false; // Ensure flag is false on failure
        console.error('Error loading from Firestore:', error);
        alert('Could not load data from the cloud. Please check your connection.');
    }
}
