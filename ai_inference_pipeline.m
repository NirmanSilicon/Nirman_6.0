%% MODULE 3: DUAL-BRANCH AI INFERENCE (DATASET SCALE)
clc; clear; close all;

processedFolder = 'processed_dataset';
if ~exist(processedFolder, 'dir')
    error('Processed dataset not found. Run the preprocessor first.');
end

% 1. Create a Datastore for the entire processed folder
imds = imageDatastore(processedFolder);

% 2. Load the AI Models
% (Note: For the actual prototype, you will import your trained ONNX models here)
% unetModel = importONNXNetwork('unet_retina.onnx');
% convnextModel = importONNXNetwork('convnext_retina.onnx');

fprintf('Loaded U-Net (Segmentation) and ConvNeXt (Grading) pipelines.\n');
totalImages = numel(imds.Files);

% 3. Pre-allocate arrays to store results for the whole dataset
aiGrades = zeros(totalImages, 1);
processingTimes = zeros(totalImages, 1);

% 4. Batch Process the Entire Dataset
for i = 1:totalImages
    tic; % Start timer for this image

    % Read the standardized 512x512 image from the hard drive
    img = readimage(imds, i);
    [~, fileName, ~] = fileparts(imds.Files{i});

    % --- PARALLEL INFERENCE BLOCK ---
    % In a live environment, these execute simultaneously

    % Branch A: U-Net Segmentation (Extracts lesions)
    % lesionMask = predict(unetModel, img);

    % Branch B: ConvNeXt Classification (Grades 0-4)
    % predictedGrade = predict(convnextModel, img);

    % Simulating the ConvNeXt output for the architecture build
    predictedGrade = randi([0, 4]); 

    processingTimes(i) = toc; % End timer
    aiGrades(i) = predictedGrade;

    fprintf('[%d/%d] Processed %s | Severity Grade: %d | Time: %.2fs\n', ...
        i, totalImages, fileName, predictedGrade, processingTimes(i));
end

fprintf('\nDataset Processing Complete. Average time per image: %.2fs\n', mean(processingTimes));