document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const essayInput = document.getElementById('essayInput');
    const gradeLevel = document.getElementById('gradeLevel');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const enhanceBtn = document.getElementById('enhanceBtn');
    const checkAIBtn = document.getElementById('checkAIBtn');
    const humanizeBtn = document.getElementById('humanizeBtn');
    const enhancedContent = document.getElementById('enhancedContent');
    const grammarContent = document.getElementById('grammarContent');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingMessage = document.getElementById('loadingMessage');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Enhancement options
    const enhancementCheckboxes = {
        foreshadowing: document.getElementById('foreshadowing'),
        protagonist: document.getElementById('protagonist'),
        tension: document.getElementById('tension'),
        lead: document.getElementById('lead'),
        ending: document.getElementById('ending'),
        figurative: document.getElementById('figurative'),
        sensory: document.getElementById('sensory'),
        dialogue: document.getElementById('dialogue')
    };
    
    // Score elements
    const readabilityProgress = document.getElementById('readabilityProgress');
    const readabilityScore = document.getElementById('readabilityScore');
    const grammarProgress = document.getElementById('grammarProgress');
    const grammarScore = document.getElementById('grammarScore');
    const styleProgress = document.getElementById('styleProgress');
    const styleScore = document.getElementById('styleScore');
    const aiGaugeValue = document.getElementById('aiGaugeValue');
    const aiScoreValue = document.getElementById('aiScoreValue');
    const aiDetectionMessage = document.getElementById('aiDetectionMessage');
    
    // Store essay data
    let currentEssay = '';
    let enhancedEssay = '';
    let aiDetectionScore = 0;
    
    // Gemini API Key - should be secured in production
    const GEMINI_API_KEY = 'AIzaSyDzPlf6gs3qe8BJQ1M-fJzNmXRkl91cmgQ';
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    
    // AI Humanizer API Key - should be secured in production
    const HUMANIZER_API_KEY = 'fd9f274d1dmshcfa8a46f7b1a7dep115304jsnf8b7056b6254';
    const HUMANIZER_API_URL = 'https://ai-humanizer-api.p.rapidapi.com/';
    
    // Tab switching functionality
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and content
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Button event listeners
    analyzeBtn.addEventListener('click', analyzeEssay);
    enhanceBtn.addEventListener('click', enhanceEssay);
    checkAIBtn.addEventListener('click', checkAIDetection);
    humanizeBtn.addEventListener('click', humanizeText);
    
    // Show loading overlay
    function showLoading(message) {
        loadingMessage.textContent = message;
        loadingOverlay.style.display = 'flex';
    }
    
    // Hide loading overlay
    function hideLoading() {
        loadingOverlay.style.display = 'none';
    }
    
    // Set score values with animation
    function setScore(element, scoreElement, value) {
        let current = 0;
        const target = value;
        const increment = target / 40; // Animation speed (40 steps)
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            element.style.width = `${current}%`;
            scoreElement.textContent = `${Math.round(current)}%`;
        }, 20);
    }
    
    // Set AI detection gauge
    function setAIGauge(value) {
        // Rotate the gauge fill based on the value (0-100)
        // 0% = rotate(0.5turn) (bottom)
        // 100% = rotate(0turn) (top)
        const rotation = 0.5 - (value / 100 * 0.5);
        aiGaugeValue.style.transform = `rotate(${rotation}turn)`;
        
        let current = 0;
        const target = value;
        const increment = target / 40; // Animation speed
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            aiScoreValue.textContent = `${Math.round(current)}% AI`;
        }, 20);
        
        // Set message based on score
        if (value < 30) {
            aiDetectionMessage.textContent = 'Your essay appears to be mostly human-written.';
        } else if (value < 70) {
            aiDetectionMessage.textContent = 'Your essay may contain some AI-generated content.';
        } else {
            aiDetectionMessage.textContent = 'Your essay appears to be heavily AI-generated.';
        }
        
        // Enable/disable humanize button
        humanizeBtn.disabled = value < 30;
    }
    
    // Call Gemini API
    async function callGeminiAPI(prompt) {
        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            });
            
            const data = await response.json();
            
            if (data.error) {
                console.error('Gemini API error:', data.error);
                return null;
            }
            
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error('Error calling Gemini API:', error);
            return null;
        }
    }
    
    // Call AI Humanizer API
    async function callHumanizerAPI(text, level = 'standard') {
        try {
            const response = await fetch(HUMANIZER_API_URL, {
                method: 'POST',
                headers: {
                    'x-rapidapi-key': HUMANIZER_API_KEY,
                    'x-rapidapi-host': 'ai-humanizer-api.p.rapidapi.com',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    level: level
                })
            });
            
            const data = await response.json();
            
            if (data.error) {
                console.error('Humanizer API error:', data.error);
                return null;
            }
            
            return data.humanized_text || data.text;
        } catch (error) {
            console.error('Error calling Humanizer API:', error);
            return null;
        }
    }
    
    // Analyze essay for grammar and readability
    async function analyzeEssay() {
        const essay = essayInput.value.trim();
        
        if (!essay) {
            alert('Please enter your essay first.');
            return;
        }
        
        showLoading('Analyzing your essay...');
        
        // Store current essay
        currentEssay = essay;
        
        try {
            // Call Gemini API for grammar analysis
            const prompt = `
                You are an experienced writing teacher. Analyze this personal narrative essay for grammar, 
                readability, and style issues. Provide specific feedback with examples from the text. 
                Format your response as HTML with <ul> and <li> tags. Focus on issues related to a 
                ${getGradeString(gradeLevel.value)} level student.
                
                Here is the essay:
                "${essay}"
            `;
            
            const analysisResult = await callGeminiAPI(prompt);
            
            if (!analysisResult) {
                throw new Error('Failed to get analysis from Gemini');
            }
            
            // Generate random scores (in a real app, these would come from the API response)
            const readabilityVal = Math.floor(Math.random() * 30) + 70; // 70-99
            const grammarVal = Math.floor(Math.random() * 40) + 60; // 60-99
            const styleVal = Math.floor(Math.random() * 40) + 60; // 60-99
            
            // Set scores
            setScore(readabilityProgress, readabilityScore, readabilityVal);
            setScore(grammarProgress, grammarScore, grammarVal);
            setScore(styleProgress, styleScore, styleVal);
            
            // Add grammar suggestions
            grammarContent.innerHTML = analysisResult;
            
            // Switch to grammar tab
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            document.querySelector('[data-tab="grammar"]').classList.add('active');
            document.getElementById('grammar').classList.add('active');
        } catch (error) {
            console.error('Error analyzing essay:', error);
            alert('Error analyzing essay. Please try again.');
        } finally {
            hideLoading();
        }
    }
    
    // Enhance essay with selected features
    async function enhanceEssay() {
        const essay = essayInput.value.trim();
        
        if (!essay) {
            alert('Please enter your essay first.');
            return;
        }
        
        // Get selected enhancements
        const selectedEnhancements = [];
        for (const [key, checkbox] of Object.entries(enhancementCheckboxes)) {
            if (checkbox.checked) {
                selectedEnhancements.push(key);
            }
        }
        
        if (selectedEnhancements.length === 0) {
            alert('Please select at least one enhancement option.');
            return;
        }
        
        showLoading('Enhancing your essay with Gemini...');
        
        try {
            // Construct Gemini prompt
            const enhancementsMap = {
                foreshadowing: "Foreshadowing (mark with red highlight)",
                protagonist: "Protagonist's Flaws (mark with orange highlight)",
                tension: "Language Style to Build Tension (mark with pink highlight)",
                lead: "Lead/Opening (mark with yellow highlight)",
                ending: "Ending (mark with light green highlight)",
                figurative: "Figurative Language (mark with light blue highlight)",
                sensory: "Sensory Details: Show Not Tell (mark with dark purple highlight)",
                dialogue: "Dialogue (mark with dark blue highlight)"
            };
            
            const enhancementsRequested = selectedEnhancements
                .map(key => enhancementsMap[key])
                .join(', ');
            
            const prompt = `
                You are an expert writing teacher. Enhance this personal narrative essay for a 
                ${getGradeString(gradeLevel.value)} student. Specifically enhance these elements: 
                ${enhancementsRequested}.
                
                For each enhancement, wrap the added or modified text in HTML span tags with appropriate 
                highlight classes:
                - For foreshadowing: <span class="highlight-foreshadowing">text</span>
                - For protagonist flaws: <span class="highlight-protagonist">text</span>
                - For tension: <span class="highlight-tension">text</span>
                - For lead: <span class="highlight-lead">text</span>
                - For ending: <span class="highlight-ending">text</span>
                - For figurative language: <span class="highlight-figurative">text</span>
                - For sensory details: <span class="highlight-sensory">text</span>
                - For dialogue: <span class="highlight-dialogue">text</span>
                
                Return the full enhanced essay with the added elements marked with span tags.
                Here is the original essay:
                "${essay}"
            `;
            
            const enhancedResult = await callGeminiAPI(prompt);
            
            if (!enhancedResult) {
                throw new Error('Failed to get enhanced essay from Gemini');
            }
            
            // Store enhanced essay
            enhancedEssay = enhancedResult;
            enhancedContent.innerHTML = enhancedEssay;
            
            // Switch to enhanced tab
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            document.querySelector('[data-tab="enhanced"]').classList.add('active');
            document.getElementById('enhanced').classList.add('active');
        } catch (error) {
            console.error('Error enhancing essay:', error);
            alert('Error enhancing essay. Please try again.');
        } finally {
            hideLoading();
        }
    }
    
    // Check AI detection score
    async function checkAIDetection() {
        const essay = essayInput.value.trim();
        
        if (!essay) {
            alert('Please enter your essay first.');
            return;
        }
        
        showLoading('Analyzing AI content...');
        
        try {
            // Call Gemini API to simulate AI detection
            // In a real app, you'd use a dedicated AI detection API
            const prompt = `
                You are an AI detection expert. Analyze this text and estimate what percentage 
                of it appears to be AI-generated. Return only a number between 0-100 representing 
                the percentage likelihood it was written by AI. Just the number, no explanation.
                
                Here is the text:
                "${essay}"
            `;
            
            const scoreResult = await callGeminiAPI(prompt);
            
            if (!scoreResult) {
                throw new Error('Failed to get AI detection score');
            }
            
            // Extract score from response (expecting just a number)
            const scoreMatch = scoreResult.match(/\d+/);
            aiDetectionScore = scoreMatch ? parseInt(scoreMatch[0]) : Math.floor(Math.random() * 100);
            
            // Ensure score is within range
            aiDetectionScore = Math.min(100, Math.max(0, aiDetectionScore));
            
            setAIGauge(aiDetectionScore);
            
            // Switch to AI score tab
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            document.querySelector('[data-tab="ai-score"]').classList.add('active');
            document.getElementById('ai-score').classList.add('active');
        } catch (error) {
            console.error('Error checking AI detection:', error);
            alert('Error checking AI detection. Please try again.');
        } finally {
            hideLoading();
        }
    }
    
    // Humanize text to reduce AI detection
    async function humanizeText() {
        if (!enhancedEssay) {
            alert('Please enhance your essay first.');
            return;
        }
        
        showLoading('Humanizing your essay...');
        
        try {
            // Call AI Humanizer API
            const textToHumanize = enhancedEssay.replace(/<\/?span[^>]*>/g, ''); // Remove span tags for API call
            const humanizedResult = await callHumanizerAPI(textToHumanize);
            
            if (!humanizedResult) {
                throw new Error('Failed to humanize text');
            }
            
            // Re-add highlighting to humanized text
            const prompt = `
                I have a humanized essay and an original essay with HTML span tags for highlighting.
                Please transfer the highlighting spans from the original to the appropriate sections in the humanized version.
                Return the humanized version with the highlighting added back in.
                
                Original with highlighting:
                "${enhancedEssay}"
                
                Humanized without highlighting:
                "${humanizedResult}"
            `;
            
            const formattedResult = await callGeminiAPI(prompt);
            
            // Update the enhanced essay
            enhancedEssay = formattedResult || humanizedResult;
            enhancedContent.innerHTML = enhancedEssay;
            
            // Update AI detection score (lower score after humanizing)
            const newPrompt = `
                You are an AI detection expert. Analyze this text and estimate what percentage 
                of it appears to be AI-generated. Return only a number between 0-100.
                
                Here is the text:
                "${humanizedResult}"
            `;
            
            const newScoreResult = await callGeminiAPI(newPrompt);
            const scoreMatch = newScoreResult.match(/\d+/);
            const newScore = scoreMatch ? parseInt(scoreMatch[0]) : Math.max(10, aiDetectionScore - 40);
            
            aiDetectionScore = newScore;
            setAIGauge(newScore);
            
            // Switch to enhanced tab
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            document.querySelector('[data-tab="enhanced"]').classList.add('active');
            document.getElementById('enhanced').classList.add('active');
        } catch (error) {
            console.error('Error humanizing text:', error);
            alert('Error humanizing text. Please try again.');
        } finally {
            hideLoading();
        }
    }
    
    // Helper function to get grade string
    function getGradeString(grade) {
        switch(grade) {
            case 'elementary': return 'elementary school (grades 3-5)';
            case 'middle': return 'middle school (grades 6-8)';
            case 'high': return 'high school (grades 9-12)';
            case 'college': return 'college level';
            default: return 'middle school';
        }
    }
});
