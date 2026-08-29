/**
 * Utility to compress image files on the client side before uploading to the server.
 * Automatically scales down large dimensions and adjusts quality if size exceeds target MB.
 *
 * @param {File} file - Original file from input
 * @param {number} maxSizeMB - Target max size in MB (default 2MB)
 * @param {number} maxDimension - Max width or height in px (default 1600px)
 * @returns {Promise<{ file: File, wasCompressed: boolean, originalSizeMB: string, compressedSizeMB: string }>}
 */
export const compressImageIfNeeded = (file, maxSizeMB = 2, maxDimension = 1600) => {
    return new Promise((resolve) => {
        if (!file || !file.type.startsWith('image/')) {
            return resolve({ file, wasCompressed: false });
        }

        const sizeInMB = file.size / (1024 * 1024);
        const originalSizeFormatted = sizeInMB.toFixed(2);

        // If file is already within target size limit, return as is
        if (sizeInMB <= maxSizeMB) {
            return resolve({
                file,
                wasCompressed: false,
                originalSizeMB: originalSizeFormatted,
                compressedSizeMB: originalSizeFormatted
            });
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Scale down max dimension while preserving aspect ratio
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Iterative compression starting at 85% quality
                const attemptBlob = (quality) => {
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                return resolve({ file, wasCompressed: false });
                            }

                            const currentSizeMB = blob.size / (1024 * 1024);
                            if (currentSizeMB <= maxSizeMB || quality <= 0.3) {
                                const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
                                const compressedFile = new File([blob], newFileName, {
                                    type: 'image/jpeg',
                                    lastModified: Date.now()
                                });
                                resolve({
                                    file: compressedFile,
                                    wasCompressed: true,
                                    originalSizeMB: originalSizeFormatted,
                                    compressedSizeMB: currentSizeMB.toFixed(2)
                                });
                            } else {
                                attemptBlob(quality - 0.15);
                            }
                        },
                        'image/jpeg',
                        quality
                    );
                };

                attemptBlob(0.85);
            };
            img.onerror = () => resolve({ file, wasCompressed: false });
        };
        reader.onerror = () => resolve({ file, wasCompressed: false });
    });
};
