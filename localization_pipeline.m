%% MODULE 2: ANATOMICAL LOCALIZATION & CROPPING
% Team NAVANSH - Diabetic Retinopathy Pipeline

clc; clear; close all;

% 1. Load the same test image
imagePath = 'test_images/sample_retina.jpg'; 
rawImage = imread(imagePath);

% 2. Create a Binary Mask
% Convert to grayscale and threshold to isolate the bright retina from the black background
grayImage = rgb2gray(rawImage);
retinaMask = grayImage > 15; % Any pixel brighter than 15 is considered "eye"

% 3. Find the Bounding Box
% regionprops automatically finds the geometry of the white blob in the mask
measurements = regionprops(retinaMask, 'BoundingBox', 'Area');

% Find the largest area (to ignore small artifacts/noise in the corners)
[~, largestIndex] = max([measurements.Area]);
boundingBox = measurements(largestIndex).BoundingBox;

% 4. Crop the Image
% imcrop physically cuts the image down to the bounding box dimensions
croppedRetina = imcrop(rawImage, boundingBox);

% 5. Apply the previous CLAHE enhancement to the newly cropped image
greenChannel = croppedRetina(:,:,2);
enhancedCropped = adapthisteq(greenChannel, 'ClipLimit', 0.02, 'Distribution', 'rayleigh');

% 6. Display the Results
figure('Name', 'Module 2: Anatomical Cropping', 'NumberTitle', 'off');

subplot(1, 2, 1);
imshow(rawImage);
hold on;
% Draw a red rectangle showing where the script decided to cut
rectangle('Position', boundingBox, 'EdgeColor', 'r', 'LineWidth', 2);
title('Original with Bounding Box');

subplot(1, 2, 2);
imshow(enhancedCropped);
title('Final Cropped & Enhanced Input for AI');