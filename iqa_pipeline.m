%% MODULE 1: EDGE-FIRST IMAGE QUALITY ASSESSMENT & ENHANCEMENT
% Team NAVANSH - Diabetic Retinopathy Pipeline

clc;
clear;
close all;

%% 1. Load Input Retinal Image
% Replace 'sample_retina.jpg' with the actual filename in your folder
imagePath = 'test_images/sample_retina.jpg'; 

if ~isfile(imagePath)
    error('Image file not found. Place a sample image inside the test_images folder.');
end

rawImage = imread(imagePath);

%% 2. Blur Quality Assessment (Laplacian Variance)
% Convert to grayscale for edge calculation
grayImage = rgb2gray(rawImage);

% Define 3x3 Laplacian filter kernel
laplacianKernel = [ 0  1  0; 
    1 -4  1; 
    0  1  0 ];

% Filter the image and compute the variance of the edge response
laplacianEdges = imfilter(double(grayImage), laplacianKernel, 'replicate');
blurScore = var(laplacianEdges(:));

% Threshold for blur (tune based on camera sensor)
BLUR_THRESHOLD = 15; 

%% 3. Lighting & Contrast Check (HSV Color Space)
hsvImage = rgb2hsv(rawImage);
brightnessChannel = hsvImage(:,:,3); % Value (Brightness) channel
meanBrightness = mean(brightnessChannel(:));

% Rejection conditions: too dark (<0.15) or overexposed (>0.85)
isWellLit = (meanBrightness >= 0.15) && (meanBrightness <= 0.85);
isSharp = (blurScore >= BLUR_THRESHOLD);

%% 4. Gatekeeper Decision Logic
fprintf('--- Image Quality Assessment (IQA) Results ---\n');
fprintf('Calculated Blur Score: %.2f (Threshold: >= %d)\n', blurScore, BLUR_THRESHOLD);
fprintf('Mean Brightness:       %.2f (Acceptable: 0.15 to 0.85)\n', meanBrightness);

if ~isSharp || ~isWellLit
    fprintf('STATUS: REJECTED\n');
    fprintf('ACTION: Retake photo. Image is ungradable.\n');
    return; % Stops processing immediately to save compute & bandwidth
else
    fprintf('STATUS: PASSED\n');
    fprintf('ACTION: Proceeding to Image Enhancement.\n');
end

%% 5. Adaptive Enhancement (Green Channel & CLAHE)
% Green channel has highest vessel-to-background contrast in fundus photography
greenChannel = rawImage(:,:,2);

% Contrast-Limited Adaptive Histogram Equalization
enhancedGreen = adapthisteq(greenChannel, ...
    'ClipLimit', 0.02, ...
    'Distribution', 'rayleigh');

%% 6. Display Visual Verification
figure('Name', 'IQA & Enhancement Verification', 'NumberTitle', 'off');

subplot(1, 3, 1);
imshow(rawImage);
title('Raw Capture');

subplot(1, 3, 2);
imshow(laplacianEdges, []);
title(sprintf('Laplacian Edges (Var: %.1f)', blurScore));

subplot(1, 3, 3);
imshow(enhancedGreen);
title('CLAHE Enhanced Green Channel');