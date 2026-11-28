function [processedImg, status, metrics] = preprocess_fundus(inputImg, blurThresh)
% Preprocessing pipeline: IQA -> Anatomical Crop -> CLAHE
if nargin < 2
    blurThresh = 15; % Calibrated default threshold
end

% 1. Quality Assessment (Laplacian Blur & Lighting)
grayImg = rgb2gray(inputImg);
laplacianKernel = [0 1 0; 1 -4 1; 0 1 0];
lapEdges = imfilter(double(grayImg), laplacianKernel, 'replicate');
blurScore = var(lapEdges(:));

hsvImg = rgb2hsv(inputImg);
brightness = mean(hsvImg(:,:,3), 'all');

metrics.blurScore = blurScore;
metrics.brightness = brightness;

% Quality check gate
if blurScore < blurThresh || brightness < 0.15 || brightness > 0.85
    status = "REJECTED";
    processedImg = [];
    return;
end
status = "PASSED";

% 2. Anatomical Localization (Remove Black Borders)
retinaMask = grayImg > 15;
props = regionprops(retinaMask, 'BoundingBox', 'Area');

if ~isempty(props)
    [~, maxIdx] = max([props.Area]);
    croppedImg = imcrop(inputImg, props(maxIdx).BoundingBox);
else
    croppedImg = inputImg;
end

% 3. Vessel Enhancement (CLAHE on Green Channel)
greenChannel = croppedImg(:,:,2);
enhancedGreen = adapthisteq(greenChannel, 'ClipLimit', 0.02, 'Distribution', 'rayleigh');

% 4. Standardize Output Size (e.g., 224x224 or 512x512 for Deep Learning)
processedImg = imresize(enhancedGreen, [512, 512]);
end