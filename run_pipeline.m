%% UNIVERSAL DATASET PROCESSOR
clc; clear; close all;

inputFolder = 'test_images'; 
outputFolder = 'processed_dataset';

if ~exist(outputFolder, 'dir')
    mkdir(outputFolder);
end

% imageDatastore automatically discovers all .png, .jpg, .tif images in the folder
imds = imageDatastore(inputFolder, ...
    'FileExtensions', {'.jpg', '.png', '.tif', '.jpeg'}, ...
    'IncludeSubfolders', true);

totalImages = numel(imds.Files);
fprintf('Found %d images across all datasets in "%s".\n\n', totalImages, inputFolder);

passedCount = 0;
rejectedCount = 0;

for i = 1:totalImages
    currentFile = imds.Files{i};
    [~, fileName, ext] = fileparts(currentFile);
    rawImg = readimage(imds, i);

    % Run the unified preprocessing function
    [cleanImg, status, metrics] = preprocess_fundus(rawImg, 15);

    if status == "PASSED"
        passedCount = passedCount + 1;
        % Save clean standardized image for ConvNeXt & U-Net training/inference
        savePath = fullfile(outputFolder, [fileName, '_prep.png']);
        imwrite(cleanImg, savePath);
        fprintf('[%d/%d] %s: PASSED (Blur: %.2f) -> Saved to %s\n', ...
            i, totalImages, fileName, metrics.blurScore, savePath);
    else
        rejectedCount = rejectedCount + 1;
        fprintf('[%d/%d] %s: REJECTED (Blur: %.2f, Brightness: %.2f)\n', ...
            i, totalImages, fileName, metrics.blurScore, metrics.brightness);
    end
end

fprintf('\nProcessing Complete: %d Passed, %d Rejected out of %d total images.\n', ...
    passedCount, rejectedCount, totalImages);