const TOGETHER_API_KEY = "PASTE-YOUR-TOGETHER-API-KEY-HERE"; // Get this from api.together.xyz
const themeToggle = document.querySelector(".theme-toggle");
const promptForm = document.querySelector(".prompt-form");
const promptInput = document.querySelector(".prompt-input");
const promptBtn = document.querySelector(".prompt-magic-btn");
const generateForm = document.querySelector("#generate-form");
const generateBtn = document.querySelector("#generate-btn");
const gridGallery = document.querySelector(".gallery-grid");
const modelSelect =  document.getElementById("model-select");
const countSelect = document.getElementById("count-select");
const ratioSelect = document.getElementById("ratio-select");


const examplePrompts = [
    "A highly detailed close-up portrait of an old wise man, cinematic lighting, 8k",
    "A cozy modern coffee shop in Tokyo during a rainy night, neon lights",
    "A mystical floating island in the sky with glowing plants and waterfalls",
    "A fierce dragon made of blue fire and ice, flying over a snowy mountain",
    "A futuristic cyberpunk samurai in a neon-lit alleyway holding a katana",
    "Futuristic spaceship cockpit looking out at a massive colorful nebula",
    "A cute baby panda in a yellow raincoat holding a small red umbrella",
    "Studio Ghibli style landscape with a grassy hill, giant tree, and blue sky"
];

// Get the saved theme from localStorage
let isDarkTheme = localStorage.getItem("theme") === "dark";

// Initialize the theme on page load
if (isDarkTheme) {
    document.body.classList.add("dark");
    themeToggle.querySelector("i").className = "fa-solid fa-sun";
}

const toggleTheme = () => {
    isDarkTheme = document.body.classList.toggle("dark");
    themeToggle.querySelector("i").className = isDarkTheme ? "fa-solid fa-sun" : "fa-solid fa-moon";
    // Save the current theme to localStorage
    localStorage.setItem("theme", isDarkTheme ? "dark" : "light");
} 

themeToggle.addEventListener("click", toggleTheme);

promptBtn.addEventListener("click",()=>{
    const prompt = examplePrompts[Math.floor(Math.random() * examplePrompts.length)];
    promptInput.value = prompt ;
    promptInput.focus();
});

// State variable to prevent overlapping requests
let isGenerating = false;

// Function to generate and display images
const generateImages = async (promptText, selectedModel, imageCount, aspectRatio) => {
    // Lock the UI
    isGenerating = true;
    generateBtn.classList.add("loading");
    generateBtn.disabled = true;
    generateBtn.querySelector("span").textContent = "Generating...";
    promptBtn.disabled = true;

    // Calculate dimensions based on aspect ratio (Using 512 for faster/more reliable free server generation)
    let width = 512, height = 512;
    if (aspectRatio === "16/9") {
        width = 512; height = 288;
    } else if (aspectRatio === "9/16") {
        width = 288; height = 512;
    }

    // Generate image cards dynamically
    const imageCardsMarkup = Array.from({ length: imageCount }, (_, i) => 
        `<div class="image-card loading" id="image-card-${i}" style="aspect-ratio: ${aspectRatio}">
            <div class="loading-spinner"></div>
            <p class="status-text">Generating...</p>
        </div>`
    ).join("");

    gridGallery.innerHTML = imageCardsMarkup;

    // Call the Pollinations API for each image
    const imagePromises = Array.from({ length: imageCount }, async (_, i) => {
        const card = document.getElementById(`image-card-${i}`);
        try {
            // Append a random number to the prompt to ensure unique images 
            // Together.ai API URL and options
            const url = "https://api.together.xyz/v1/images/generations";
            const options = {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${TOGETHER_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "black-forest-labs/FLUX.1-schnell-Free",
                    prompt: promptText,
                    width: width,
                    height: height,
                    steps: 4,
                    n: 1,
                    response_format: "b64_json"
                })
            };

            // Stagger requests to avoid overwhelming
            if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, i * 1000));
            }

            const response = await fetch(url, options);
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error?.message || "Failed to generate image!");
            }

            const data = await response.json();
            const b64Json = data.data[0].b64_json;
            const imageUrl = "data:image/png;base64," + b64Json;

            // Wait for image to fully decode and load before injecting it
            const imgElement = document.createElement("img");
            imgElement.src = imageUrl;
            imgElement.alt = promptText;

            await new Promise((resolve, reject) => {
                imgElement.onload = resolve;
                imgElement.onerror = reject;
            });

            // Update UI once the image is ready
            card.classList.remove("loading");
            card.innerHTML = `
                <a href="${imageUrl}" class="download-btn" download="${promptText.replace(/\s+/g, '-').toLowerCase()}-${i}.png">
                    <i class="fa-solid fa-download"></i>
                </a>
            `;
            card.prepend(imgElement);

        } catch (error) {
            console.error(error);
            card.classList.remove("loading");
            card.innerHTML = `<p class="status-text" style="color: red; padding: 1rem; text-align: center;">${error.message}</p>`;
        }
    });

    // Wait for all images to finish
    await Promise.all(imagePromises);

    // Restore UI state
    isGenerating = false;
    generateBtn.classList.remove("loading");
    generateBtn.disabled = false;
    generateBtn.querySelector("span").textContent = "Generate";
    promptBtn.disabled = false;
};

const handleFormSubmit = (e) => {
    e.preventDefault();
    if (isGenerating) return;
    
    // Extract input values
    const selectedModel = modelSelect.value; 
    const imageCount = parseInt(countSelect.value) || 2;
    const aspectRatio = ratioSelect.value || "1/1";
    const promptText = promptInput.value.trim();

    // Generate images
    generateImages(promptText, selectedModel, imageCount, aspectRatio);
};

generateForm.addEventListener("submit", handleFormSubmit);
