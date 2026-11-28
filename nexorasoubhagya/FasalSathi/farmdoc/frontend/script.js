console.log("FARMDOC SCRIPT FILE LOADED");
const imageInput = document.getElementById("imageInput");
const browseBtn = document.getElementById("browseBtn");
const uploadArea = document.getElementById("uploadArea");

const uploadPlaceholder = document.getElementById("uploadPlaceholder");
const previewContainer = document.getElementById("previewContainer");
const imagePreview = document.getElementById("imagePreview");
const fileName = document.getElementById("fileName");

const removeImage = document.getElementById("removeImage");
const analyzeBtn = document.getElementById("analyzeBtn");
console.log("Analyze button found:", analyzeBtn);
console.log("Image input found:", imageInput);
const resultsSection = document.getElementById("resultsSection");
const detectionResult = document.getElementById("detectionResult");
const advisoryText = document.getElementById("advisoryText");

const languageSelect = document.getElementById("languageSelect");
const speakBtn = document.getElementById("speakBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn = document.getElementById("stopBtn");

let selectedImage = null;
let previewURL = null;


// OPEN IMAGE PICKER

browseBtn.addEventListener("click", () => {
    imageInput.click();
});

uploadArea.addEventListener("click", (event) => {
    if (
        event.target.closest("button") ||
        event.target.closest("#previewContainer")
    ) {
        return;
    }

    if (!selectedImage) {
        imageInput.click();
    }
});


// SELECT AND PREVIEW IMAGE

imageInput.addEventListener("change", (event) => {

    const file = event.target.files[0];

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
        alert("Please select a JPG or PNG image.");
        imageInput.value = "";
        return;
    }

    if (previewURL) {
        URL.revokeObjectURL(previewURL);
    }

    selectedImage = file;
    previewURL = URL.createObjectURL(file);

    imagePreview.src = previewURL;
    fileName.textContent = file.name;

    uploadPlaceholder.hidden = true;
    previewContainer.hidden = false;

    analyzeBtn.disabled = false;
    resultsSection.hidden = true;

    speechSynthesis.cancel();
});


// REMOVE IMAGE

removeImage.addEventListener("click", () => {

    selectedImage = null;

    if (previewURL) {
        URL.revokeObjectURL(previewURL);
        previewURL = null;
    }

    imagePreview.src = "";
    imageInput.value = "";

    uploadPlaceholder.hidden = false;
    previewContainer.hidden = true;

    analyzeBtn.disabled = true;
    resultsSection.hidden = true;

    speechSynthesis.cancel();
});


// CONNECT TO FASTAPI AND ANALYZE IMAGE

analyzeBtn.addEventListener("click", async () => {
    console.log("ANALYZE BUTTON CLICKED");
    if (!selectedImage) {
        alert("Please upload an image first.");
        return;
    }

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "Analyzing...";

    detectionResult.textContent = "Analyzing your crop...";
    advisoryText.textContent = "Generating your AI advisory...";

    resultsSection.hidden = false;

    try {

        const formData = new FormData();
        formData.append("file", selectedImage);

        const response = await fetch(
            "http://127.0.0.1:8002/analyze",
            {
                method: "POST",
                body: formData
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Analysis failed.");
        }

        // DISPLAY CROP AND DISEASE RESULTS

        detectionResult.replaceChildren();

        const results = [
            ["Detected Crop", data.crop],
            ["Crop Confidence", data.crop_confidence + "%"],
            ["Detected Disease", data.disease],
            ["Disease Confidence", data.disease_confidence + "%"]
        ];

        results.forEach(([label, value]) => {

            const paragraph = document.createElement("p");
            const strong = document.createElement("strong");

            strong.textContent = label + ": ";
            paragraph.appendChild(strong);
            paragraph.appendChild(
                document.createTextNode(String(value))
            );

            detectionResult.appendChild(paragraph);
        });

        // DISPLAY AI ADVISORY

        advisoryText.textContent = data.advisory;

    } catch (error) {

        console.error("FarmDoc Error:", error);

        detectionResult.textContent = "Unable to complete crop analysis.";

        advisoryText.textContent =
            "Analysis failed: " + error.message;

        alert("FarmDoc Error: " + error.message);

    } finally {

        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = "<span>✦</span> Analyze Crop";

    }

});


// VOICE ADVISORY

speakBtn.addEventListener("click", () => {

    const text = advisoryText.innerText.trim();

    if (!text || text.includes("Generating your AI advisory")) {
        alert("No advisory available yet.");
        return;
    }

    if (!("speechSynthesis" in window)) {
        alert("Voice playback is not supported in this browser.");
        return;
    }

    speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(text);

    speech.lang = languageSelect.value;
    speech.rate = 0.9;
    speech.pitch = 1;

    speechSynthesis.speak(speech);

});


// PAUSE AND RESUME VOICE

pauseBtn.addEventListener("click", () => {

    if (speechSynthesis.speaking && !speechSynthesis.paused) {
        speechSynthesis.pause();
    } else if (speechSynthesis.paused) {
        speechSynthesis.resume();
    }

});


// STOP VOICE

stopBtn.addEventListener("click", () => {
    speechSynthesis.cancel();
});
document.getElementById("analyzeBtn").onclick = function () {
    console.log("DIRECT BUTTON CLICK WORKS");
};